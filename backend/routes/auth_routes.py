from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario, Billetera
from schemas import SyncUsuarioRequest
from dependencies import verificar_id_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sync")
def sync_usuario(
    data: SyncUsuarioRequest,
    decoded_token: dict = Depends(verificar_id_token),
    db: Session = Depends(get_db),
):
    """Crea o actualiza el usuario local a partir del token de Firebase.
    Se llama tras registrarse y en cada login para mantener la BD sincronizada
    con el estado de verificación de correo de Firebase."""
    firebase_uid = decoded_token["uid"]
    email = decoded_token.get("email", "")
    email_verificado = decoded_token.get("email_verified", False)

    usuario = db.query(Usuario).filter(Usuario.firebase_uid == firebase_uid).first()

    if usuario:
        usuario.nombre = data.nombre or usuario.nombre
        usuario.telefono = data.telefono or usuario.telefono
        usuario.email_verificado = email_verificado
        db.commit()
    else:
        usuario = Usuario(
            firebase_uid=firebase_uid,
            nombre=data.nombre,
            email=email,
            email_verificado=email_verificado,
            telefono=data.telefono,
        )
        db.add(usuario)
        db.flush()

        billetera = Billetera(usuario_id=usuario.id)
        db.add(billetera)
        db.commit()

    return {
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "email": usuario.email,
        "email_verificado": usuario.email_verificado,
        "verificado": usuario.verificado,
    }
