from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator

from database import get_db
from models import Billetera, Calificacion, Usuario
from dependencies import get_usuario_actual, contexto_escrow, parse_uuid
from notificaciones import enviar_notificacion
from utils import iso_utc

router = APIRouter(prefix="/calificacion", tags=["calificacion"])


def resumen_calificacion(db: Session, usuario_id) -> dict:
    """Promedio y cantidad de calificaciones de un usuario. Reusado en perfil_routes.py."""
    fila = (
        db.query(func.avg(Calificacion.puntuacion), func.count(Calificacion.id))
        .filter(Calificacion.calificado_id == usuario_id)
        .first()
    )
    promedio, cantidad = fila
    return {
        "calificacion_promedio": round(float(promedio), 1) if promedio is not None else None,
        "calificacion_cantidad": cantidad or 0,
    }


class CalificacionCreate(BaseModel):
    puntuacion: int
    comentario: str | None = Field(default=None, max_length=1000)

    @field_validator("puntuacion")
    @classmethod
    def puntuacion_valida(cls, v):
        if v < 1 or v > 5:
            raise ValueError("La puntuación debe estar entre 1 y 5")
        return v


@router.post("/{escrow_id}")
def calificar(
    escrow_id: str,
    data: CalificacionCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, transaccion, _, es_comprador, _ = contexto_escrow(escrow_id, usuario, db)

    if escrow.estado != "liberado":
        raise HTTPException(status_code=400, detail="Solo puedes calificar operaciones ya liberadas")

    ya_calificado = (
        db.query(Calificacion)
        .filter(Calificacion.escrow_id == escrow.id, Calificacion.calificador_id == usuario.id)
        .first()
    )
    if ya_calificado:
        raise HTTPException(status_code=400, detail="Ya calificaste esta operación")

    otra_billetera_id = transaccion.billetera_destino if es_comprador else transaccion.billetera_origen
    otra_billetera = db.query(Billetera).filter(Billetera.id == otra_billetera_id).first()
    if not otra_billetera:
        raise HTTPException(status_code=409, detail="No se encontró a la contraparte")

    calificacion = Calificacion(
        escrow_id=escrow.id,
        calificador_id=usuario.id,
        calificado_id=otra_billetera.usuario_id,
        puntuacion=data.puntuacion,
        comentario=data.comentario,
    )
    db.add(calificacion)
    db.commit()

    enviar_notificacion(
        db, otra_billetera.usuario_id,
        "Recibiste una calificación",
        f"{usuario.nombre} te calificó con {data.puntuacion} estrella{'s' if data.puntuacion != 1 else ''}",
    )

    return {"mensaje": "Calificación registrada correctamente"}


@router.get("/usuario/{usuario_id}")
def ver_calificaciones(
    usuario_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    uid = parse_uuid(usuario_id, "Usuario no encontrado")

    # Comentarios con su autor en un solo query (sin N+1).
    filas = (
        db.query(Calificacion, Usuario.nombre)
        .outerjoin(Usuario, Usuario.id == Calificacion.calificador_id)
        .filter(Calificacion.calificado_id == uid, Calificacion.comentario.isnot(None))
        .order_by(Calificacion.creado_en.desc())
        .limit(limit)
        .all()
    )

    resumen = resumen_calificacion(db, uid)

    return {
        "promedio": resumen["calificacion_promedio"],
        "cantidad": resumen["calificacion_cantidad"],
        "comentarios": [
            {
                "nombre": nombre or "Usuario",
                "puntuacion": c.puntuacion,
                "comentario": c.comentario,
                "fecha": iso_utc(c.creado_en),
            }
            for c, nombre in filas
        ],
    }
