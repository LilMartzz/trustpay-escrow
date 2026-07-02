from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from database import get_db
from models import Billetera, Transaccion, Escrow, Calificacion, Usuario
from dependencies import get_usuario_actual
from notificaciones import enviar_notificacion

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
    comentario: str | None = None

    @field_validator("puntuacion")
    @classmethod
    def puntuacion_valida(cls, v):
        if v < 1 or v > 5:
            raise ValueError("La puntuación debe estar entre 1 y 5")
        return v


def _verificar_participante(escrow_id: str, usuario, db: Session):
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")
    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    es_comprador = str(billetera.id) == str(transaccion.billetera_origen)
    es_vendedor = str(billetera.id) == str(transaccion.billetera_destino)
    if not es_comprador and not es_vendedor:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta operación")
    return escrow, transaccion, es_comprador


@router.post("/{escrow_id}")
def calificar(
    escrow_id: str,
    data: CalificacionCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, transaccion, es_comprador = _verificar_participante(escrow_id, usuario, db)

    if escrow.estado != "liberado":
        raise HTTPException(status_code=400, detail="Solo puedes calificar operaciones ya liberadas")

    ya_calificado = (
        db.query(Calificacion)
        .filter(Calificacion.escrow_id == escrow_id, Calificacion.calificador_id == usuario.id)
        .first()
    )
    if ya_calificado:
        raise HTTPException(status_code=400, detail="Ya calificaste esta operación")

    otra_billetera_id = transaccion.billetera_destino if es_comprador else transaccion.billetera_origen
    otra_billetera = db.query(Billetera).filter(Billetera.id == otra_billetera_id).first()

    calificacion = Calificacion(
        escrow_id=escrow_id,
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
def ver_calificaciones(usuario_id: str, db: Session = Depends(get_db)):
    calificaciones = (
        db.query(Calificacion)
        .filter(Calificacion.calificado_id == usuario_id)
        .order_by(Calificacion.creado_en.desc())
        .all()
    )

    resumen = resumen_calificacion(db, usuario_id)

    comentarios = []
    for c in calificaciones[:10]:
        if not c.comentario:
            continue
        calificador = db.query(Usuario).filter(Usuario.id == c.calificador_id).first()
        comentarios.append({
            "nombre": calificador.nombre if calificador else "Usuario",
            "puntuacion": c.puntuacion,
            "comentario": c.comentario,
            "fecha": str(c.creado_en),
        })

    return {
        "promedio": resumen["calificacion_promedio"],
        "cantidad": resumen["calificacion_cantidad"],
        "comentarios": comentarios,
    }
