from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import Billetera, Transaccion, Escrow, Usuario, Calificacion
from dependencies import get_usuario_actual
from tasks import procesar_escrows_vencidos
from notificaciones import enviar_notificacion
from decimal import Decimal
from datetime import datetime, timedelta

router = APIRouter(prefix="/escrow", tags=["escrow"])


@router.post("/iniciar")
def iniciar_escrow(
    email_destino: str,
    monto: float,
    descripcion: str = "",
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    destino = db.query(Usuario).filter(Usuario.email == email_destino).first()
    if not destino:
        raise HTTPException(status_code=404, detail="Usuario destino no encontrado")
    if destino.id == usuario.id:
        raise HTTPException(status_code=400, detail="No puedes enviarte a ti mismo")

    billetera_origen = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    billetera_destino = db.query(Billetera).filter(Billetera.usuario_id == destino.id).first()

    disponible = float(billetera_origen.saldo - billetera_origen.saldo_retenido)
    if disponible < monto:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    billetera_origen.saldo_retenido += Decimal(str(monto))

    transaccion = Transaccion(
        billetera_origen=billetera_origen.id,
        billetera_destino=billetera_destino.id,
        monto=Decimal(str(monto)),
        tipo="escrow",
        estado="pendiente",
        descripcion=descripcion or None,
    )
    db.add(transaccion)
    db.flush()

    escrow = Escrow(
        transaccion_id=transaccion.id,
        monto_retenido=Decimal(str(monto)),
        estado="retenido",
        expira_en=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(escrow)
    db.commit()

    enviar_notificacion(
        db, destino.id,
        "Nuevo escrow recibido",
        f"{usuario.nombre} te envió S/ {monto:.2f} en escrow",
    )

    return {
        "mensaje": f"S/ {monto:.2f} retenido en escrow para {destino.nombre}",
        "transaccion_id": str(transaccion.id),
        "escrow_id": str(escrow.id),
        "expira_en": str(escrow.expira_en),
    }


@router.post("/confirmar/{escrow_id}")
def confirmar_escrow(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")
    if escrow.estado != "retenido":
        raise HTTPException(status_code=400, detail=f"Escrow ya está {escrow.estado}")
    if escrow.expira_en < datetime.utcnow():
        escrow.estado = "expirado"
        db.commit()
        raise HTTPException(status_code=400, detail="Escrow expirado")

    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    billetera_usuario = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()

    if str(billetera_usuario.id) != str(transaccion.billetera_origen):
        raise HTTPException(status_code=403, detail="Solo el comprador puede confirmar la recepción")

    billetera_origen = db.query(Billetera).filter(Billetera.id == transaccion.billetera_origen).first()
    billetera_destino = db.query(Billetera).filter(Billetera.id == transaccion.billetera_destino).first()

    billetera_origen.saldo -= escrow.monto_retenido
    billetera_origen.saldo_retenido -= escrow.monto_retenido
    billetera_destino.saldo += escrow.monto_retenido

    transaccion.estado = "completada"
    escrow.estado = "liberado"
    escrow.liberado_en = datetime.utcnow()
    db.commit()

    enviar_notificacion(
        db, billetera_destino.usuario_id,
        "Pago recibido",
        f"Recibiste S/ {float(escrow.monto_retenido):.2f} — {usuario.nombre} confirmó la recepción",
    )

    return {
        "mensaje": "Escrow liberado y fondos transferidos exitosamente",
        "monto_transferido": float(escrow.monto_retenido),
        "liberado_en": str(escrow.liberado_en),
    }


@router.post("/cancelar/{escrow_id}")
def cancelar_escrow(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")
    if escrow.estado != "retenido":
        raise HTTPException(status_code=400, detail=f"Escrow ya está {escrow.estado}")

    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    billetera_usuario = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()

    if str(billetera_usuario.id) != str(transaccion.billetera_origen):
        raise HTTPException(status_code=403, detail="Solo el comprador puede cancelar")

    billetera_origen = db.query(Billetera).filter(Billetera.id == transaccion.billetera_origen).first()
    billetera_destino = db.query(Billetera).filter(Billetera.id == transaccion.billetera_destino).first()
    billetera_origen.saldo_retenido -= escrow.monto_retenido

    transaccion.estado = "cancelada"
    escrow.estado = "cancelado"
    db.commit()

    enviar_notificacion(
        db, billetera_destino.usuario_id,
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
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")

    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    billetera_usuario = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()

    es_comprador = str(billetera_usuario.id) == str(transaccion.billetera_origen)
    es_vendedor = str(billetera_usuario.id) == str(transaccion.billetera_destino)
    if not es_comprador and not es_vendedor:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta operación")

    # Resolve counterparty info
    otra_billetera_id = transaccion.billetera_destino if es_comprador else transaccion.billetera_origen
    otra_billetera = db.query(Billetera).filter(Billetera.id == otra_billetera_id).first()
    contraparte = db.query(Usuario).filter(Usuario.id == otra_billetera.usuario_id).first()

    ya_calificado = (
        db.query(Calificacion)
        .filter(Calificacion.escrow_id == escrow_id, Calificacion.calificador_id == usuario.id)
        .first()
        is not None
    )

    return {
        "escrow_id": str(escrow.id),
        "monto_retenido": float(escrow.monto_retenido),
        "estado": escrow.estado,
        "descripcion": transaccion.descripcion,
        "expira_en": str(escrow.expira_en),
        "liberado_en": str(escrow.liberado_en) if escrow.liberado_en else None,
        "rol": "comprador" if es_comprador else "vendedor",
        "contraparte": contraparte.nombre if contraparte else None,
        "contraparte_id": str(contraparte.id) if contraparte else None,
        "contraparte_email": contraparte.email if contraparte else None,
        "ya_calificado": ya_calificado,
    }


@router.get("/mis-operaciones")
def mis_operaciones(
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()

    transacciones = (
        db.query(Transaccion)
        .filter(
            (Transaccion.billetera_origen == billetera.id)
            | (Transaccion.billetera_destino == billetera.id),
            Transaccion.tipo == "escrow",
        )
        .order_by(Transaccion.creado_en.desc())
        .all()
    )

    resultado = []
    for t in transacciones:
        escrow = db.query(Escrow).filter(Escrow.transaccion_id == t.id).first()
        if not escrow:
            continue
        es_comprador = str(billetera.id) == str(t.billetera_origen)

        otra_billetera_id = t.billetera_destino if es_comprador else t.billetera_origen
        otra_billetera = db.query(Billetera).filter(Billetera.id == otra_billetera_id).first()
        otro_usuario = db.query(Usuario).filter(Usuario.id == otra_billetera.usuario_id).first()

        resultado.append({
            "escrow_id": str(escrow.id),
            "monto": float(t.monto),
            "estado": escrow.estado,
            "rol": "comprador" if es_comprador else "vendedor",
            "contraparte": otro_usuario.nombre,
            "contraparte_email": otro_usuario.email,
            "descripcion": t.descripcion,
            "fecha": str(t.creado_en),
            "expira_en": str(escrow.expira_en),
        })

    return resultado


@router.post("/procesar-vencidos")
def procesar_vencidos_manual(db: Session = Depends(get_db)):
    """Fuerza la liberación inmediata de todos los escrows vencidos. Sin auth — solo usar desde panel admin."""
    procesar_escrows_vencidos(SessionLocal)
    vencidos = db.query(Escrow).filter(
        Escrow.estado == "retenido",
        Escrow.expira_en < datetime.utcnow(),
    ).count()
    return {"mensaje": "Proceso completado", "pendientes_aun": vencidos}
