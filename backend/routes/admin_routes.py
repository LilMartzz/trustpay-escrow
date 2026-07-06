from utils import utcnow

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Escrow, Transaccion, Envio
from dependencies import requiere_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(requiere_admin)])


@router.get("/metricas")
def metricas(db: Session = Depends(get_db)):
    """Métricas agregadas para la tesis: adopción, volumen protegido por el
    escrow y señales de fraude evitado. Solo datos agregados, nada personal."""

    usuarios_total = db.query(func.count(Usuario.id)).scalar() or 0
    usuarios_verificados = (
        db.query(func.count(Usuario.id)).filter(Usuario.verificado == "verificado").scalar() or 0
    )

    escrows_por_estado = dict(
        db.query(Escrow.estado, func.count(Escrow.id)).group_by(Escrow.estado).all()
    )
    monto_por_estado = {
        estado: float(monto or 0)
        for estado, monto in db.query(Escrow.estado, func.sum(Escrow.monto_retenido))
        .group_by(Escrow.estado)
        .all()
    }

    # Cancelaciones con envío ya registrado: el patrón de fraude que el escrow
    # intercepta (el comprador intentando recuperar el dinero con el producto
    # en tránsito). Desde este cambio el backend las bloquea.
    cancelados_con_envio = (
        db.query(func.count(Escrow.id))
        .join(Envio, Envio.escrow_id == Escrow.id)
        .filter(Escrow.estado == "cancelado")
        .scalar()
        or 0
    )

    # Tiempo promedio entre crear el escrow y la liberación de fondos.
    filas = (
        db.query(Transaccion.creado_en, Escrow.liberado_en)
        .join(Escrow, Escrow.transaccion_id == Transaccion.id)
        .filter(Escrow.estado == "liberado", Escrow.liberado_en.isnot(None))
        .all()
    )
    horas = [
        (liberado - creado).total_seconds() / 3600
        for creado, liberado in filas
        if creado and liberado
    ]
    horas_promedio_liberacion = round(sum(horas) / len(horas), 1) if horas else None

    depositos = dict(
        db.query(Transaccion.estado, func.count(Transaccion.id))
        .filter(Transaccion.tipo == "deposito_mercadopago")
        .group_by(Transaccion.estado)
        .all()
    )

    return {
        "generado_en": utcnow().isoformat() + "Z",
        "usuarios": {
            "total": usuarios_total,
            "verificados": usuarios_verificados,
            "tasa_verificacion": round(usuarios_verificados / usuarios_total, 3) if usuarios_total else None,
        },
        "escrows": {
            "por_estado": escrows_por_estado,
            "monto_por_estado": monto_por_estado,
            "monto_protegido_total": float(
                db.query(func.sum(Escrow.monto_retenido)).scalar() or 0
            ),
            "cancelados_con_envio_registrado": cancelados_con_envio,
            "horas_promedio_hasta_liberacion": horas_promedio_liberacion,
        },
        "depositos_mercadopago": depositos,
    }
