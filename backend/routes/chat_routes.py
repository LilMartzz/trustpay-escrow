from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from database import get_db
from models import Billetera, Transaccion, Escrow, Mensaje, Usuario
from dependencies import get_usuario_actual

router = APIRouter(prefix="/chat", tags=["chat"])


class MensajeCreate(BaseModel):
    contenido: str

    @field_validator("contenido")
    @classmethod
    def no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El mensaje no puede estar vacío")
        return v.strip()


def _verificar_participante(escrow_id: str, usuario, db: Session):
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")
    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    es_parte = (
        str(billetera.id) == str(transaccion.billetera_origen)
        or str(billetera.id) == str(transaccion.billetera_destino)
    )
    if not es_parte:
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")
    return escrow


@router.post("/{escrow_id}")
def enviar_mensaje(
    escrow_id: str,
    data: MensajeCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _verificar_participante(escrow_id, usuario, db)

    mensaje = Mensaje(
        escrow_id=escrow_id,
        remitente_id=usuario.id,
        contenido=data.contenido,
    )
    db.add(mensaje)
    db.commit()

    return {
        "id": str(mensaje.id),
        "contenido": mensaje.contenido,
        "remitente_nombre": usuario.nombre,
        "es_propio": True,
        "creado_en": str(mensaje.creado_en),
    }


@router.get("/{escrow_id}")
def obtener_mensajes(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _verificar_participante(escrow_id, usuario, db)

    mensajes = (
        db.query(Mensaje)
        .filter(Mensaje.escrow_id == escrow_id)
        .order_by(Mensaje.creado_en.asc())
        .all()
    )

    resultado = []
    for m in mensajes:
        remitente = db.query(Usuario).filter(Usuario.id == m.remitente_id).first()
        resultado.append({
            "id": str(m.id),
            "contenido": m.contenido,
            "remitente_id": str(m.remitente_id),
            "remitente_nombre": remitente.nombre if remitente else "Usuario",
            "es_propio": str(m.remitente_id) == str(usuario.id),
            "creado_en": str(m.creado_en),
        })

    return resultado
