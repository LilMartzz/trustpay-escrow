import uuid
import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from dependencies import get_usuario_actual
from rekognition_client import comparar_rostros

router = APIRouter(prefix="/perfil", tags=["perfil"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
        }
        for u in resultados
    ]


@router.get("/")
def ver_perfil(usuario=Depends(get_usuario_actual)):
    return {
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "verificado": usuario.verificado,
        "dni_numero": usuario.dni_numero,
        "dni_frontal_url": usuario.dni_frontal_url,
        "dni_reverso_url": usuario.dni_reverso_url,
        "selfie_url": usuario.selfie_url,
        "creado_en": str(usuario.creado_en),
    }


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
        except Exception:
            pass

    usuario.dni_numero = numero_dni
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

    def guardar(archivo, prefijo):
        ext = archivo.filename.rsplit(".", 1)[-1].lower()
        if ext not in {"jpg", "jpeg", "png", "webp"}:
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG o PNG")
        contenido = archivo.file.read()
        nombre = f"{prefijo}_{uuid.uuid4()}.{ext}"
        ruta = os.path.join(UPLOAD_DIR, nombre)
        with open(ruta, "wb") as f:
            f.write(contenido)
        return f"/uploads/{nombre}", contenido

    dni_frontal_url, dni_frontal_bytes = guardar(dni_frontal, "dni_frontal")
    dni_reverso_url, _ = guardar(dni_reverso, "dni_reverso")
    selfie_url, selfie_bytes = guardar(selfie, "selfie")

    coincide, similitud = comparar_rostros(selfie_bytes, dni_frontal_bytes)

    usuario.dni_frontal_url = dni_frontal_url
    usuario.dni_reverso_url = dni_reverso_url
    usuario.selfie_url = selfie_url
    usuario.verificado = "verificado" if coincide else "pendiente"
    db.commit()

    return {
        "mensaje": (
            "¡Identidad verificada automáticamente!"
            if coincide
            else "Documentos recibidos. Tu identidad será verificada en breve."
        ),
        "verificado": usuario.verificado,
        "similitud": similitud,
    }
