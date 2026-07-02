from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario

security = HTTPBearer()


def verificar_id_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        return firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def get_usuario_actual(
    decoded_token: dict = Depends(verificar_id_token),
    db: Session = Depends(get_db),
) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.firebase_uid == decoded_token["uid"]).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario
