import os
import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Calificacion, Billetera, Transaccion, Escrow
from dependencies import get_usuario_actual, requiere_admin, rate_limiter, parse_uuid
from rekognition_client import comparar_rostros
from almacenamiento import guardar_documento_privado, leer_documento_privado
from schemas import FcmTokenRequest
from routes.calificacion_routes import resumen_calificacion
from utils import iso_utc

router = APIRouter(prefix="/perfil", tags=["perfil"])

TAMANO_MAXIMO_DOCUMENTO = 8 * 1024 * 1024  # 8 MB por imagen


class PerfilUpdate(BaseModel):
    nombre: str | None = Field(default=None, max_length=120)
    telefono: str | None = Field(default=None, max_length=20)


class DniRequest(BaseModel):
    numero_dni: str


def _normalizar(texto: str) -> str:
    """minúsculas y sin tildes, para comparar nombres."""
    descompuesto = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn").lower()


def _nombre_coincide(nombre_cuenta: str, nombre_reniec: str) -> bool:
    """Al menos 2 palabras (o todas, si el nombre de la cuenta tiene menos)
    del nombre de la cuenta deben aparecer en el nombre registrado en RENIEC."""
    if not nombre_reniec:
        return True  # sin dato de RENIEC no hay nada que contrastar
    tokens_cuenta = [t for t in _normalizar(nombre_cuenta).split() if len(t) >= 3]
    if not tokens_cuenta:
        return False
    tokens_reniec = set(_normalizar(nombre_reniec).split())
    coincidencias = sum(1 for t in tokens_cuenta if t in tokens_reniec)
    return coincidencias >= min(2, len(tokens_cuenta))


@router.get("/buscar")
def buscar_usuarios(
    q: str = "",
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    """Busca usuarios por nombre o email (excluye al usuario actual). Máx 6 resultados."""
    if len(q.strip()) < 1:
        return []
    term = q.strip().lower()
    resultados = (
        db.query(Usuario)
        .filter(
            or_(
                func.lower(Usuario.nombre).like(f"{term}%"),
                func.lower(Usuario.email).like(f"{term}%"),
            ),
            Usuario.id != usuario.id,
        )
        .limit(6)
        .all()
    )
    return [
        {
            "nombre": u.nombre,
            "email": u.email,
            "verificado": u.verificado,
            "iniciales": u.nombre[:2].upper(),
            **resumen_calificacion(db, u.id),
        }
        for u in resultados
    ]


@router.get("/")
def ver_perfil(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    return {
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "verificado": usuario.verificado,
        "dni_numero": usuario.dni_numero,
        "nombre_reniec": usuario.dni_nombre_reniec,
        "documentos_subidos": bool(usuario.dni_frontal_url and usuario.selfie_url),
        "creado_en": iso_utc(usuario.creado_en),
        **resumen_calificacion(db, usuario.id),
    }


@router.get("/publico/{email}")
def perfil_publico(
    email: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    """Perfil visible para otros usuarios: reputación, distribución de estrellas
    y cada valoración con su descripción. No expone datos sensibles (DNI, teléfono)."""
    u = db.query(Usuario).filter(func.lower(Usuario.email) == email.strip().lower()).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Calificaciones con su autor en un solo query (sin N+1).
    filas = (
        db.query(Calificacion, Usuario.nombre)
        .outerjoin(Usuario, Usuario.id == Calificacion.calificador_id)
        .filter(Calificacion.calificado_id == u.id)
        .order_by(Calificacion.creado_en.desc())
        .all()
    )

    distribucion = {n: 0 for n in range(1, 6)}
    lista = []
    for c, autor_nombre in filas:
        distribucion[c.puntuacion] = distribucion.get(c.puntuacion, 0) + 1
        lista.append({
            "puntuacion": c.puntuacion,
            "comentario": c.comentario,
            "fecha": iso_utc(c.creado_en),
            "autor": autor_nombre or "Usuario",
            "autor_iniciales": (autor_nombre[:2].upper() if autor_nombre else "??"),
        })

    # Operaciones escrow completadas (como comprador o vendedor)
    operaciones_completadas = 0
    billetera = db.query(Billetera).filter(Billetera.usuario_id == u.id).first()
    if billetera:
        operaciones_completadas = (
            db.query(func.count(Escrow.id))
            .join(Transaccion, Escrow.transaccion_id == Transaccion.id)
            .filter(
                Escrow.estado == "liberado",
                or_(
                    Transaccion.billetera_origen == billetera.id,
                    Transaccion.billetera_destino == billetera.id,
                ),
            )
            .scalar()
        ) or 0

    resumen = resumen_calificacion(db, u.id)
    return {
        "nombre": u.nombre,
        "email": u.email,
        "verificado": u.verificado,
        "miembro_desde": iso_utc(u.creado_en),
        "promedio": resumen["calificacion_promedio"],
        "cantidad": resumen["calificacion_cantidad"],
        "distribucion": distribucion,
        "operaciones_completadas": operaciones_completadas,
        "calificaciones": lista,
    }


@router.post("/fcm-token")
def guardar_fcm_token(
    data: FcmTokenRequest,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    usuario.fcm_token = data.token
    db.commit()
    return {"mensaje": "Token de notificaciones guardado"}


@router.put("/actualizar")
def actualizar_perfil(
    data: PerfilUpdate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    if data.nombre and data.nombre != usuario.nombre:
        # El nombre quedó contrastado contra RENIEC al verificar la identidad;
        # permitir cambiarlo después dejaría el badge "verificado" sin sustento.
        if usuario.verificado == "verificado":
            raise HTTPException(
                status_code=403,
                detail="Tu identidad ya fue verificada con este nombre: no puede modificarse.",
            )
        usuario.nombre = data.nombre
    if data.telefono:
        usuario.telefono = data.telefono
    db.commit()
    return {"mensaje": "Perfil actualizado correctamente"}


@router.post("/validar-dni")
def validar_dni(
    data: DniRequest,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    # Cada llamada consume cuota de apiperu y permitiría enumerar DNIs.
    rate_limiter.verificar(f"dni:{usuario.id}", 5, 600)

    if usuario.verificado == "verificado":
        raise HTTPException(status_code=400, detail="Tu cuenta ya está verificada")

    numero_dni = data.numero_dni.strip()
    if not re.match(r"^\d{8}$", numero_dni):
        raise HTTPException(
            status_code=400,
            detail="El DNI debe tener exactamente 8 dígitos numéricos",
        )

    # Un DNI identifica a una sola persona: no puede estar en dos cuentas.
    duplicado = (
        db.query(Usuario)
        .filter(Usuario.dni_numero == numero_dni, Usuario.id != usuario.id)
        .first()
    )
    if duplicado:
        raise HTTPException(
            status_code=409,
            detail="Este DNI ya está registrado en otra cuenta de TrustPay",
        )

    resultado = {"valido": True, "numero_dni": numero_dni, "verificado_reniec": False}
    nombre_reniec = None

    api_key = os.getenv("APIPERU_API_KEY", "")
    if api_key:
        try:
            import httpx

            resp = httpx.get(
                f"https://apiperu.dev/api/dni/{numero_dni}",
                params={"api_token": api_key},
                timeout=8,
            )
            if resp.status_code == 200:
                body = resp.json()
                if body.get("success"):
                    data_reniec = body.get("data", {})
                    nombre_reniec = (
                        f"{data_reniec.get('nombres', '')} "
                        f"{data_reniec.get('apellido_paterno', '')} "
                        f"{data_reniec.get('apellido_materno', '')}"
                    ).strip()
                    resultado["verificado_reniec"] = True
                    resultado["nombre_reniec"] = nombre_reniec
                else:
                    # RENIEC respondió y el DNI no existe: no lo guardamos.
                    raise HTTPException(
                        status_code=400,
                        detail="El DNI ingresado no figura en RENIEC. Verifica el número.",
                    )
        except HTTPException:
            raise
        except Exception:
            pass  # si apiperu está caído, seguimos con la validación de formato

    usuario.dni_numero = numero_dni
    usuario.dni_nombre_reniec = nombre_reniec
    db.commit()

    return resultado


@router.post("/verificar")
def verificar_identidad(
    dni_frontal: UploadFile = File(...),
    dni_reverso: UploadFile = File(...),
    selfie: UploadFile = File(...),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    rate_limiter.verificar(f"verificar:{usuario.id}", 3, 600)

    if usuario.verificado == "verificado":
        raise HTTPException(status_code=400, detail="Tu cuenta ya está verificada")
    if not usuario.dni_numero:
        raise HTTPException(
            status_code=400,
            detail="Primero valida tu número de DNI (paso 1) antes de subir documentos",
        )

    def guardar(archivo, prefijo):
        ext = (archivo.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in {"jpg", "jpeg", "png", "webp"}:
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG o PNG")
        contenido = archivo.file.read(TAMANO_MAXIMO_DOCUMENTO + 1)
        if len(contenido) > TAMANO_MAXIMO_DOCUMENTO:
            raise HTTPException(status_code=413, detail="Cada imagen debe pesar máximo 8 MB")
        return guardar_documento_privado(contenido, prefijo, ext), contenido

    dni_frontal_ref, dni_frontal_bytes = guardar(dni_frontal, "dni_frontal")
    dni_reverso_ref, _ = guardar(dni_reverso, "dni_reverso")
    selfie_ref, selfie_bytes = guardar(selfie, "selfie")

    coincide_rostro, similitud = comparar_rostros(selfie_bytes, dni_frontal_bytes)
    nombre_ok = _nombre_coincide(usuario.nombre, usuario.dni_nombre_reniec)

    usuario.dni_frontal_url = dni_frontal_ref
    usuario.dni_reverso_url = dni_reverso_ref
    usuario.selfie_url = selfie_ref
    usuario.similitud_facial = similitud
    usuario.verificado = "verificado" if (coincide_rostro and nombre_ok) else "pendiente"
    db.commit()

    if coincide_rostro and nombre_ok:
        mensaje = "¡Identidad verificada automáticamente!"
    elif coincide_rostro and not nombre_ok:
        mensaje = (
            "Tu selfie coincide con el documento, pero el nombre registrado en RENIEC "
            "no coincide con el nombre de tu cuenta. Tus documentos quedaron en revisión manual."
        )
    else:
        mensaje = (
            "Documentos recibidos. No pudimos validar tu selfie automáticamente, "
            "así que quedaron en revisión manual."
        )

    return {
        "mensaje": mensaje,
        "verificado": usuario.verificado,
        "similitud": similitud,
        "nombre_coincide": nombre_ok,
    }


@router.get("/documento/{tipo}")
def ver_documento(tipo: str, usuario=Depends(get_usuario_actual)):
    """Sirve los documentos de identidad SOLO a su dueño (ya no hay URLs públicas)."""
    columnas = {
        "dni_frontal": "dni_frontal_url",
        "dni_reverso": "dni_reverso_url",
        "selfie": "selfie_url",
    }
    if tipo not in columnas:
        raise HTTPException(status_code=404, detail="Tipo de documento inválido")
    resultado = leer_documento_privado(getattr(usuario, columnas[tipo]))
    if resultado is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    contenido, content_type = resultado
    return Response(content=contenido, media_type=content_type)


# ── Revisión manual (requiere header X-Admin-Key = env ADMIN_API_KEY) ──

@router.get("/admin/verificaciones-pendientes", dependencies=[Depends(requiere_admin)])
def listar_verificaciones_pendientes(db: Session = Depends(get_db)):
    pendientes = db.query(Usuario).filter(Usuario.verificado == "pendiente").all()
    return [
        {
            "usuario_id": str(u.id),
            "nombre": u.nombre,
            "email": u.email,
            "dni_numero": u.dni_numero,
            "nombre_reniec": u.dni_nombre_reniec,
            "documentos_subidos": bool(u.dni_frontal_url and u.selfie_url),
            "similitud_facial": float(u.similitud_facial) if u.similitud_facial is not None else None,
        }
        for u in pendientes
    ]


@router.post("/admin/resolver-verificacion/{usuario_id}", dependencies=[Depends(requiere_admin)])
def resolver_verificacion(
    usuario_id: str,
    decision: str,
    db: Session = Depends(get_db),
):
    if decision not in {"aprobar", "rechazar"}:
        raise HTTPException(status_code=400, detail="decision debe ser 'aprobar' o 'rechazar'")
    u = db.query(Usuario).filter(Usuario.id == parse_uuid(usuario_id, "Usuario no encontrado")).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.verificado != "pendiente":
        raise HTTPException(status_code=400, detail="El usuario no tiene una verificación pendiente")
    u.verificado = "verificado" if decision == "aprobar" else "no_verificado"
    db.commit()
    return {"mensaje": f"Verificación de {u.email}: {decision}", "verificado": u.verificado}
