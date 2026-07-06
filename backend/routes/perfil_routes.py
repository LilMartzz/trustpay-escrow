import os
import re
import unicodedata
from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from dependencies import get_usuario_actual
from rekognition_client import comparar_rostros
from almacenamiento import guardar_documento_privado, leer_documento_privado
from schemas import FcmTokenRequest
from routes.calificacion_routes import resumen_calificacion

router = APIRouter(prefix="/perfil", tags=["perfil"])


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


def _requiere_admin(x_admin_key: str | None):
    clave = os.getenv("ADMIN_API_KEY")
    if not clave:
        raise HTTPException(status_code=503, detail="Revisión manual no configurada (falta ADMIN_API_KEY)")
    if x_admin_key != clave:
        raise HTTPException(status_code=403, detail="Clave de administrador inválida")


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
        "creado_en": str(usuario.creado_en),
        **resumen_calificacion(db, usuario.id),
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
    nombre: str = None,
    telefono: str = None,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    if nombre:
        usuario.nombre = nombre
    if telefono:
        usuario.telefono = telefono
    db.commit()
    return {"mensaje": "Perfil actualizado correctamente"}


@router.post("/validar-dni")
def validar_dni(
    numero_dni: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    numero_dni = numero_dni.strip()
    if not re.match(r"^\d{8}$", numero_dni):
        raise HTTPException(
            status_code=400,
            detail="El DNI debe tener exactamente 8 dígitos numéricos",
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
                    data = body.get("data", {})
                    nombre_reniec = (
                        f"{data.get('nombres', '')} "
                        f"{data.get('apellido_paterno', '')} "
                        f"{data.get('apellido_materno', '')}"
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
    if usuario.verificado == "verificado":
        raise HTTPException(status_code=400, detail="Tu cuenta ya está verificada")
    if not usuario.dni_numero:
        raise HTTPException(
            status_code=400,
            detail="Primero valida tu número de DNI (paso 1) antes de subir documentos",
        )

    def guardar(archivo, prefijo):
        ext = archivo.filename.rsplit(".", 1)[-1].lower()
        if ext not in {"jpg", "jpeg", "png", "webp"}:
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG o PNG")
        contenido = archivo.file.read()
        return guardar_documento_privado(contenido, prefijo, ext), contenido

    dni_frontal_ref, dni_frontal_bytes = guardar(dni_frontal, "dni_frontal")
    dni_reverso_ref, _ = guardar(dni_reverso, "dni_reverso")
    selfie_ref, selfie_bytes = guardar(selfie, "selfie")

    coincide_rostro, similitud = comparar_rostros(selfie_bytes, dni_frontal_bytes)
    nombre_ok = _nombre_coincide(usuario.nombre, usuario.dni_nombre_reniec)

    usuario.dni_frontal_url = dni_frontal_ref
    usuario.dni_reverso_url = dni_reverso_ref
    usuario.selfie_url = selfie_ref
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

@router.get("/admin/verificaciones-pendientes")
def listar_verificaciones_pendientes(
    x_admin_key: str = Header(None),
    db: Session = Depends(get_db),
):
    _requiere_admin(x_admin_key)
    pendientes = db.query(Usuario).filter(Usuario.verificado == "pendiente").all()
    return [
        {
            "usuario_id": str(u.id),
            "nombre": u.nombre,
            "email": u.email,
            "dni_numero": u.dni_numero,
            "nombre_reniec": u.dni_nombre_reniec,
            "documentos_subidos": bool(u.dni_frontal_url and u.selfie_url),
        }
        for u in pendientes
    ]


@router.post("/admin/resolver-verificacion/{usuario_id}")
def resolver_verificacion(
    usuario_id: str,
    decision: str,
    x_admin_key: str = Header(None),
    db: Session = Depends(get_db),
):
    _requiere_admin(x_admin_key)
    if decision not in {"aprobar", "rechazar"}:
        raise HTTPException(status_code=400, detail="decision debe ser 'aprobar' o 'rechazar'")
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.verificado != "pendiente":
        raise HTTPException(status_code=400, detail="El usuario no tiene una verificación pendiente")
    u.verificado = "verificado" if decision == "aprobar" else "no_verificado"
    db.commit()
    return {"mensaje": f"Verificación de {u.email}: {decision}", "verificado": u.verificado}
