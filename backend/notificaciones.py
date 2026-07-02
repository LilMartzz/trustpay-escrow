from firebase_admin import messaging
from sqlalchemy.orm import Session
from models import Usuario


def enviar_notificacion(db: Session, usuario_id, titulo: str, cuerpo: str, data: dict | None = None):
    """Manda un push por FCM al usuario si tiene un token registrado.
    Nunca lanza excepción: un fallo de notificación no puede tumbar la operación que la dispara."""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario or not usuario.fcm_token:
        return

    try:
        mensaje = messaging.Message(
            notification=messaging.Notification(title=titulo, body=cuerpo),
            data={k: str(v) for k, v in (data or {}).items()},
            token=usuario.fcm_token,
        )
        messaging.send(mensaje)
    except Exception:
        pass
