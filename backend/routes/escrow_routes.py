from datetime import timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import Billetera, Transaccion, Escrow, Usuario, Calificacion, Envio
from dependencies import (
    get_usuario_actual,
    requiere_email_verificado,
    requiere_admin,
    get_billetera,
    bloquear_billeteras,
    contexto_escrow,
    rate_limiter,
)
from tasks import procesar_escrows_vencidos
from notificaciones import enviar_notificacion
from ledger import registrar_asientos
from utils import iso_utc, utcnow, MONTO_MAXIMO

router = APIRouter(prefix="/escrow", tags=["escrow"])


class EscrowCreate(BaseModel):
    email_destino: str
    monto: Decimal = Field(gt=0, le=MONTO_MAXIMO, decimal_places=2)
    descripcion: str = ""


@router.post("/iniciar")
def iniciar_escrow(
    data: EscrowCreate,
    usuario=Depends(requiere_email_verificado),
    db: Session = Depends(get_db),
):
    rate_limiter.verificar(f"escrow:{usuario.id}", 20, 60)

    destino = db.query(Usuario).filter(Usuario.email == data.email_destino).first()
    if not destino:
        raise HTTPException(status_code=404, detail="Usuario destino no encontrado")
    if destino.id == usuario.id:
        raise HTTPException(status_code=400, detail="No puedes enviarte a ti mismo")

    billetera_origen = get_billetera(db, usuario)
    billetera_destino = get_billetera(db, destino)

    # El saldo se verifica con la fila bloqueada: dos escrows simultáneos no
    # pueden retener el mismo dinero.
    bloqueadas = bloquear_billeteras(db, billetera_origen.id, billetera_destino.id)
    billetera_origen = bloqueadas[billetera_origen.id]

    disponible = billetera_origen.saldo - billetera_origen.saldo_retenido
    if disponible < data.monto:
        db.rollback()
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    billetera_origen.saldo_retenido += data.monto

    transaccion = Transaccion(
        billetera_origen=billetera_origen.id,
        billetera_destino=billetera_destino.id,
        monto=data.monto,
        tipo="escrow",
        estado="pendiente",
        descripcion=data.descripcion or None,
    )
    db.add(transaccion)
    db.flush()

    escrow = Escrow(
        transaccion_id=transaccion.id,
        monto_retenido=data.monto,
        estado="retenido",
        expira_en=utcnow() + timedelta(hours=24),
    )
    db.add(escrow)
    db.commit()

    enviar_notificacion(
        db, destino.id,
        "Nuevo escrow recibido",
        f"{usuario.nombre} te envió S/ {data.monto:.2f} en escrow",
    )

    return {
        "mensaje": f"S/ {data.monto:.2f} retenido en escrow para {destino.nombre}",
        "transaccion_id": str(transaccion.id),
        "escrow_id": str(escrow.id),
        "expira_en": iso_utc(escrow.expira_en),
    }


def _liberar_fondos(db: Session, escrow: Escrow, transaccion: Transaccion):
    """Transfiere los fondos retenidos al vendedor. Requiere el escrow ya
    bloqueado (FOR UPDATE) y en estado 'retenido'."""
    bloqueadas = bloquear_billeteras(db, transaccion.billetera_origen, transaccion.billetera_destino)
    origen = bloqueadas[transaccion.billetera_origen]
    destino = bloqueadas[transaccion.billetera_destino]

    origen.saldo -= escrow.monto_retenido
    origen.saldo_retenido -= escrow.monto_retenido
    destino.saldo += escrow.monto_retenido

    transaccion.estado = "completada"
    escrow.estado = "liberado"
    escrow.liberado_en = utcnow()
    registrar_asientos(db, transaccion.id, [
        (origen.id, -escrow.monto_retenido),
        (destino.id, escrow.monto_retenido),
    ])
    return destino


@router.post("/confirmar/{escrow_id}")
def confirmar_escrow(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    # bloquear=True: si la auto-liberación está procesando este escrow, esta
    # request espera y luego ve el estado ya actualizado (no hay doble abono).
    escrow, transaccion, _, es_comprador, _ = contexto_escrow(escrow_id, usuario, db, bloquear=True)

    if escrow.estado != "retenido":
        raise HTTPException(status_code=400, detail=f"Escrow ya está {escrow.estado}")
    if not es_comprador:
        raise HTTPException(status_code=403, detail="Solo el comprador puede confirmar la recepción")

    # Nota: confirmar después de expira_en es válido — el vencimiento libera
    # al vendedor de todas formas, así que la confirmación tardía hace lo mismo.
    # (Antes se marcaba "expirado" y los fondos quedaban retenidos para siempre.)
    destino = _liberar_fondos(db, escrow, transaccion)
    db.commit()

    enviar_notificacion(
        db, destino.usuario_id,
        "Pago recibido",
        f"Recibiste S/ {float(escrow.monto_retenido):.2f} — {usuario.nombre} confirmó la recepción",
    )

    return {
        "mensaje": "Escrow liberado y fondos transferidos exitosamente",
        "monto_transferido": float(escrow.monto_retenido),
        "liberado_en": iso_utc(escrow.liberado_en),
    }


@router.post("/cancelar/{escrow_id}")
def cancelar_escrow(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, transaccion, _, es_comprador, _ = contexto_escrow(escrow_id, usuario, db, bloquear=True)

    if escrow.estado != "retenido":
        raise HTTPException(status_code=400, detail=f"Escrow ya está {escrow.estado}")
    if not es_comprador:
        raise HTTPException(status_code=403, detail="Solo el comprador puede cancelar")

    # Protección al vendedor: si ya despachó el pedido, el comprador no puede
    # cancelar unilateralmente (quedarse con el producto y recuperar el dinero).
    envio = db.query(Envio).filter(Envio.escrow_id == escrow.id).first()
    if envio and envio.estado in ("en_camino", "entregado"):
        raise HTTPException(
            status_code=409,
            detail="El vendedor ya despachó el pedido: no puedes cancelar unilateralmente. "
                   "Coordina con él por el chat de la operación.",
        )

    bloqueadas = bloquear_billeteras(db, transaccion.billetera_origen)
    billetera_origen = bloqueadas[transaccion.billetera_origen]
    billetera_origen.saldo_retenido -= escrow.monto_retenido

    transaccion.estado = "cancelada"
    escrow.estado = "cancelado"
    db.commit()

    destino = db.query(Billetera).filter(Billetera.id == transaccion.billetera_destino).first()
    if destino:
        enviar_notificacion(
            db, destino.usuario_id,
            "Escrow cancelado",
            f"{usuario.nombre} canceló el escrow de S/ {float(escrow.monto_retenido):.2f}",
        )

    return {
        "mensaje": "Escrow cancelado y fondos liberados al remitente",
        "monto_devuelto": float(escrow.monto_retenido),
    }


@router.get("/estado/{escrow_id}")
def estado_escrow(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, transaccion, _, es_comprador, _ = contexto_escrow(escrow_id, usuario, db)

    otra_billetera_id = transaccion.billetera_destino if es_comprador else transaccion.billetera_origen
    contraparte = (
        db.query(Usuario)
        .join(Billetera, Billetera.usuario_id == Usuario.id)
        .filter(Billetera.id == otra_billetera_id)
        .first()
    )

    ya_calificado = (
        db.query(Calificacion)
        .filter(Calificacion.escrow_id == escrow.id, Calificacion.calificador_id == usuario.id)
        .first()
        is not None
    )

    return {
        "escrow_id": str(escrow.id),
        "monto_retenido": float(escrow.monto_retenido),
        "estado": escrow.estado,
        "descripcion": transaccion.descripcion,
        "expira_en": iso_utc(escrow.expira_en),
        "liberado_en": iso_utc(escrow.liberado_en),
        "rol": "comprador" if es_comprador else "vendedor",
        "contraparte": contraparte.nombre if contraparte else None,
        "contraparte_id": str(contraparte.id) if contraparte else None,
        "contraparte_email": contraparte.email if contraparte else None,
        "ya_calificado": ya_calificado,
    }


@router.get("/mis-operaciones")
def mis_operaciones(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    billetera = get_billetera(db, usuario)

    filas = (
        db.query(Escrow, Transaccion)
        .join(Transaccion, Escrow.transaccion_id == Transaccion.id)
        .filter(
            (Transaccion.billetera_origen == billetera.id)
            | (Transaccion.billetera_destino == billetera.id),
            Transaccion.tipo == "escrow",
        )
        .order_by(Transaccion.creado_en.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Contrapartes en un solo query en lugar de 2 por fila (N+1).
    otras_ids = {
        (t.billetera_destino if str(billetera.id) == str(t.billetera_origen) else t.billetera_origen)
        for _, t in filas
    }
    contrapartes = {}
    if otras_ids:
        for b, u in (
            db.query(Billetera, Usuario)
            .join(Usuario, Usuario.id == Billetera.usuario_id)
            .filter(Billetera.id.in_(otras_ids))
            .all()
        ):
            contrapartes[str(b.id)] = u

    resultado = []
    for escrow, t in filas:
        es_comprador = str(billetera.id) == str(t.billetera_origen)
        otra_id = str(t.billetera_destino if es_comprador else t.billetera_origen)
        otro_usuario = contrapartes.get(otra_id)
        resultado.append({
            "escrow_id": str(escrow.id),
            "monto": float(t.monto),
            "estado": escrow.estado,
            "rol": "comprador" if es_comprador else "vendedor",
            "contraparte": otro_usuario.nombre if otro_usuario else None,
            "contraparte_email": otro_usuario.email if otro_usuario else None,
            "descripcion": t.descripcion,
            "fecha": iso_utc(t.creado_en),
            "expira_en": iso_utc(escrow.expira_en),
        })

    return resultado


@router.post("/procesar-vencidos", dependencies=[Depends(requiere_admin)])
def procesar_vencidos_manual(db: Session = Depends(get_db)):
    """Fuerza la liberación inmediata de todos los escrows vencidos (solo admin)."""
    procesar_escrows_vencidos(SessionLocal)
    vencidos = db.query(Escrow).filter(
        Escrow.estado == "retenido",
        Escrow.expira_en < utcnow(),
    ).count()
    return {"mensaje": "Proceso completado", "pendientes_aun": vencidos}
