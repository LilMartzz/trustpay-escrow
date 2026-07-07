from utils import utcnow, iso_utc

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Escrow, Transaccion, Envio, AsientoContable, Billetera
from dependencies import requiere_admin
from ledger import verificar_ledger

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(requiere_admin)])


@router.get("/verificar-ledger")
def verificar_ledger_endpoint(db: Session = Depends(get_db)):
    """Audita el ledger de doble entrada: los asientos de cada movimiento
    deben sumar cero y el saldo derivado de cada billetera debe coincidir con
    billetera.saldo. Cualquier discrepancia indica corrupción de saldos (o
    saldo previo a la existencia del ledger)."""
    reporte = verificar_ledger(db)
    reporte["generado_en"] = utcnow().isoformat() + "Z"
    return reporte


@router.get("/asientos")
def listar_asientos(
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Asientos contables más recientes, con la cuenta resuelta a un nombre
    legible (email del dueño de la billetera o cuenta del sistema)."""
    filas = (
        db.query(AsientoContable, Transaccion.tipo)
        .join(Transaccion, Transaccion.id == AsientoContable.transaccion_id)
        .order_by(AsientoContable.creado_en.desc(), AsientoContable.id)
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Dueños de billetera en un solo query.
    billetera_ids = {a.billetera_id for a, _ in filas if a.billetera_id}
    duenos = {}
    if billetera_ids:
        for b, u in (
            db.query(Billetera, Usuario)
            .join(Usuario, Usuario.id == Billetera.usuario_id)
            .filter(Billetera.id.in_(billetera_ids))
            .all()
        ):
            duenos[str(b.id)] = u.email

    return [
        {
            "id": str(a.id),
            "transaccion_id": str(a.transaccion_id),
            "tipo": tipo,
            "cuenta": (
                duenos.get(str(a.billetera_id), "billetera desconocida")
                if a.billetera_id
                else f"sistema:{a.cuenta_sistema}"
            ),
            "monto": float(a.monto),
            "fecha": iso_utc(a.creado_en),
        }
        for a, tipo in filas
    ]


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
