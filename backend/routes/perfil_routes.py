from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid, os, shutil

router = APIRouter(prefix="/perfil", tags=["perfil"])
security = HTTPBearer()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    usuario = db.query(Usuario).filter(Usuario.id == payload["sub"]).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.get("/")
def ver_perfil(usuario=Depends(get_usuario_actual)):
    return {
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "verificado": usuario.verificado,
        "dni_url": usuario.dni_url,
        "selfie_url": usuario.selfie_url,
        "creado_en": str(usuario.creado_en)
    }

@router.put("/actualizar")
def actualizar_perfil(
    nombre: str = None,
    telefono: str = None,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    if nombre: usuario.nombre = nombre
    if telefono: usuario.telefono = telefono
    db.commit()
    return {"mensaje": "Perfil actualizado correctamente"}

@router.post("/verificar")
def verificar_identidad(
    dni: UploadFile = File(...),
    selfie: UploadFile = File(...),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    if usuario.verificado == "verificado":
        raise HTTPException(status_code=400, detail="Tu cuenta ya está verificada")

    def guardar(archivo, prefijo):
        ext = archivo.filename.split(".")[-1]
        nombre = f"{prefijo}_{uuid.uuid4()}.{ext}"
        ruta = os.path.join(UPLOAD_DIR, nombre)
        with open(ruta, "wb") as f:
            shutil.copyfileobj(archivo.file, f)
        return f"/uploads/{nombre}"

    usuario.dni_url = guardar(dni, "dni")
    usuario.selfie_url = guardar(selfie, "selfie")
    usuario.verificado = "verificado"
    db.commit()

    return {
        "mensaje": "Identidad verificada correctamente",
        "verificado": usuario.verificado
    }