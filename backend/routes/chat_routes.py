from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator

from database import get_db
from models import Billetera, Mensaje, Usuario
from dependencies import get_usuario_actual, contexto_escrow
from notificaciones import enviar_notificacion
from utils import iso_utc

router = APIRouter(prefix="/chat", tags=["chat"])


class MensajeCreate(BaseModel):
    contenido: str = Field(max_length=2000)

    @field_validator("contenido")
    @classmethod
    def no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El mensaje no puede estar vacío")
        return v.strip()


@router.post("/{escrow_id}")
def enviar_mensaje(
    escrow_id: str,
    data: MensajeCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, transaccion, billetera, es_comprador, _ = contexto_escrow(escrow_id, usuario, db)

    mensaje = Mensaje(
        escrow_id=escrow.id,
        remitente_id=usuario.id,
        contenido=data.contenido,
    )
    db.add(mensaje)
    db.commit()

    otra_billetera_id = transaccion.billetera_destino if es_comprador else transaccion.billetera_origen
    otra_billetera = db.query(Billetera).filter(Billetera.id == otra_billetera_id).first()
    if otra_billetera:
        enviar_notificacion(
            db, otra_billetera.usuario_id,
            f"Nuevo mensaje de {usuario.nombre}",
            data.contenido[:100],
        )

    return {
        "id": str(mensaje.id),
        "contenido": mensaje.contenido,
        "remitente_nombre": usuario.nombre,
        "es_propio": True,
        "creado_en": iso_utc(mensaje.creado_en),
    }


@router.get("/{escrow_id}")
def obtener_mensajes(
    escrow_id: str,
    limit: int = Query(200, ge=1, le=500),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, *_ = contexto_escrow(escrow_id, usuario, db)

    # Últimos `limit` mensajes con su remitente en un solo query (sin N+1),
    # devueltos en orden cronológico.
    filas = (
        db.query(Mensaje, Usuario.nombre)
        .outerjoin(Usuario, Usuario.id == Mensaje.remitente_id)
        .filter(Mensaje.escrow_id == escrow.id)
        .order_by(Mensaje.creado_en.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(m.id),
            "contenido": m.contenido,
            "remitente_id": str(m.remitente_id),
            "remitente_nombre": nombre or "Usuario",
            "es_propio": str(m.remitente_id) == str(usuario.id),
            "creado_en": iso_utc(m.creado_en),
        }
        for m, nombre in reversed(filas)
    ]
