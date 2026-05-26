import uuid
import os
import re
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from dependencies import get_usuario_actual

router = APIRouter(prefix="/perfil", tags=["perfil"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/")
def ver_perfil(usuario=Depends(get_usuario_actual)):
    return {
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "verificado": usuario.verificado,
        "dni_numero": usuario.dni_numero,
        "dni_url": usuario.dni_url,
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

    api_key = os.getenv("RENIEC_API_KEY", "")
    if api_key:
        try:
            import httpx

            resp = httpx.get(
                f"https://api.apis.net.pe/v2/dni?numero={numero_dni}",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=8,
            )
            if resp.status_code == 200:
                data = resp.json()
                nombre_reniec = (
                    f"{data.get('nombres', '')} "
                    f"{data.get('apellidoPaterno', '')} "
                    f"{data.get('apellidoMaterno', '')}"
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
    dni: UploadFile = File(...),
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
        nombre = f"{prefijo}_{uuid.uuid4()}.{ext}"
        ruta = os.path.join(UPLOAD_DIR, nombre)
        with open(ruta, "wb") as f:
            shutil.copyfileobj(archivo.file, f)
        return f"/uploads/{nombre}"

    usuario.dni_url = guardar(dni, "dni")
    usuario.selfie_url = guardar(selfie, "selfie")
    usuario.verificado = "pendiente"
    db.commit()

    return {
        "mensaje": "Documentos recibidos. Tu identidad será verificada en breve.",
        "verificado": usuario.verificado,
    }
