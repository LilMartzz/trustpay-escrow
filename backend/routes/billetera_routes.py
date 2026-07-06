import hashlib
import hmac
import os
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Billetera, Transaccion, Usuario
from dependencies import (
    get_usuario_actual,
    requiere_email_verificado,
    get_billetera,
    bloquear_billeteras,
    rate_limiter,
)
from mercadopago_client import crear_pago, obtener_orden
from utils import iso_utc, MONTO_MAXIMO

router = APIRouter(prefix="/billetera", tags=["billetera"])


class DepositoRequest(BaseModel):
    monto: Decimal = Field(gt=0, le=MONTO_MAXIMO, decimal_places=2)
    mp_token: str
    payment_method_id: str
    identification_number: str = Field(min_length=6, max_length=15)
    # Mercado Pago rechaza la operación si payer.email pertenece a una cuenta real
    # de Mercado Pago cuando se opera con credenciales de cuentas de prueba
    # ("Unauthorized use of live credentials"), así que el email del pagador es el
    # del formulario de la tarjeta, no el de la sesión.
    payer_email: str | None = None
    payment_type_id: str = "credit_card"


class TransferenciaRequest(BaseModel):
    email_destino: str
    monto: Decimal = Field(gt=0, le=MONTO_MAXIMO, decimal_places=2)


@router.get("/saldo")
def ver_saldo(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    billetera = get_billetera(db, usuario)
    return {
        "usuario": usuario.nombre,
        "saldo": float(billetera.saldo),
        "saldo_retenido": float(billetera.saldo_retenido),
        "saldo_disponible": float(billetera.saldo - billetera.saldo_retenido),
    }


def _acreditar_deposito(db: Session, transaccion: Transaccion, referencia_mp: str | None):
    """Acredita un depósito pendiente con la billetera bloqueada. Idempotente:
    solo actúa si la transacción sigue en 'pendiente'."""
    fila = (
        db.query(Transaccion)
        .filter(Transaccion.id == transaccion.id, Transaccion.estado == "pendiente")
        .with_for_update()
        .first()
    )
    if not fila:
        return False
    billetera = bloquear_billeteras(db, fila.billetera_destino)[fila.billetera_destino]
    billetera.saldo += fila.monto
    fila.estado = "completada"
    if referencia_mp:
        fila.referencia_externa = referencia_mp
    db.commit()
    return True


@router.post("/depositar")
def depositar(
    data: DepositoRequest,
    usuario=Depends(requiere_email_verificado),
    db: Session = Depends(get_db),
):
    rate_limiter.verificar(f"depositar:{usuario.id}", 8, 60)
    billetera = get_billetera(db, usuario)

    # 1. La intención se persiste ANTES de cobrar: si el proceso muere después
    # del cobro, el webhook concilia contra esta transacción pendiente en vez
    # de dejar dinero cobrado sin acreditar.
    transaccion = Transaccion(
        billetera_origen=None,
        billetera_destino=billetera.id,
        monto=data.monto,
        tipo="deposito_mercadopago",
        estado="pendiente",
    )
    db.add(transaccion)
    db.commit()
    db.refresh(transaccion)

    # 2. Cobro con clave de idempotencia estable (el id de la transacción):
    # un reintento de red no genera un segundo cobro.
    pago = crear_pago(
        data.mp_token,
        data.monto,
        data.payer_email or usuario.email,
        data.payment_method_id,
        data.identification_number,
        payment_type_id=data.payment_type_id,
        external_reference=f"deposito-{transaccion.id}",
        idempotency_key=str(transaccion.id),
    )

    if pago["estado"] == "aprobado":
        _acreditar_deposito(db, transaccion, pago["id"])
        db.refresh(billetera)
        return {
            "estado": "aprobado",
            "mensaje": f"Depósito de S/ {data.monto:.2f} exitoso",
            "saldo": float(billetera.saldo),
            "referencia": pago["id"],
            "fecha": datetime.now(timezone.utc).isoformat(),
        }

    if pago["estado"] == "pendiente":
        transaccion.referencia_externa = pago["id"]
        db.commit()
        return {
            "estado": "pendiente",
            "mensaje": pago["mensaje"],
            "referencia": pago["id"],
        }

    transaccion.estado = "fallida"
    db.commit()
    if pago["mensaje"] == "Mercado Pago no está configurado":
        raise HTTPException(status_code=503, detail=pago["mensaje"])
    raise HTTPException(status_code=400, detail=pago["mensaje"])


def _firma_webhook_valida(request: Request, data_id: str) -> bool:
    """Valida el header x-signature de Mercado Pago (HMAC-SHA256 sobre el
    manifiesto id/request-id/ts con MP_WEBHOOK_SECRET)."""
    secreto = os.getenv("MP_WEBHOOK_SECRET")
    if not secreto:
        # Sin secreto configurado no se puede validar; se acepta porque la
        # conciliación consulta la orden real a la API de MP (un webhook
        # falsificado no puede acreditar dinero que MP no confirme).
        return True

    firma = request.headers.get("x-signature", "")
    partes = dict(
        p.strip().split("=", 1) for p in firma.split(",") if "=" in p
    )
    ts, v1 = partes.get("ts"), partes.get("v1")
    if not ts or not v1:
        return False

    request_id = request.headers.get("x-request-id", "")
    manifiesto = f"id:{data_id};request-id:{request_id};ts:{ts};"
    esperado = hmac.new(secreto.encode(), manifiesto.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, v1)


@router.post("/webhook-mp")
async def webhook_mp(request: Request, db: Session = Depends(get_db)):
    """Notificaciones de Mercado Pago. Concilia depósitos pendientes: busca la
    orden real en la API de MP y acredita si quedó procesada. Idempotente."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    data_id = str(
        request.query_params.get("data.id")
        or (body.get("data") or {}).get("id")
        or ""
    )
    if not data_id:
        return {"status": "ignorado"}

    if not _firma_webhook_valida(request, data_id.lower()):
        raise HTTPException(status_code=401, detail="Firma inválida")

    orden = obtener_orden(data_id)
    if not orden:
        return {"status": "orden_no_encontrada"}

    referencia = orden.get("external_reference") or ""
    if not referencia.startswith("deposito-"):
        return {"status": "ignorado"}

    transaccion = (
        db.query(Transaccion)
        .filter(Transaccion.id == referencia.removeprefix("deposito-"))
        .first()
    ) if _es_uuid(referencia.removeprefix("deposito-")) else None
    if not transaccion:
        return {"status": "sin_transaccion"}

    status = (orden.get("status") or "").lower()
    if status == "processed":
        acreditado = _acreditar_deposito(db, transaccion, str(orden.get("id")))
        return {"status": "acreditado" if acreditado else "ya_procesado"}
    if status in ("failed", "canceled", "cancelled", "expired") and transaccion.estado == "pendiente":
        transaccion.estado = "fallida"
        db.commit()
        return {"status": "marcado_fallido"}
    return {"status": "sin_cambios"}


def _es_uuid(valor: str) -> bool:
    import uuid
    try:
        uuid.UUID(valor)
        return True
    except (ValueError, AttributeError):
        return False


@router.post("/transferir")
def transferir(
    data: TransferenciaRequest,
    usuario=Depends(requiere_email_verificado),
    db: Session = Depends(get_db),
):
    rate_limiter.verificar(f"transferir:{usuario.id}", 15, 60)

    destino = db.query(Usuario).filter(Usuario.email == data.email_destino).first()
    if not destino:
        raise HTTPException(status_code=404, detail="Usuario destino no encontrado")
    if destino.id == usuario.id:
        raise HTTPException(status_code=400, detail="No puedes transferirte a ti mismo")

    billetera_origen = get_billetera(db, usuario)
    billetera_destino = get_billetera(db, destino)

    # Saldo verificado con las filas bloqueadas: dos transferencias simultáneas
    # no pueden gastar el mismo dinero.
    bloqueadas = bloquear_billeteras(db, billetera_origen.id, billetera_destino.id)
    billetera_origen = bloqueadas[billetera_origen.id]
    billetera_destino = bloqueadas[billetera_destino.id]

    disponible = billetera_origen.saldo - billetera_origen.saldo_retenido
    if disponible < data.monto:
        db.rollback()
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    billetera_origen.saldo -= data.monto
    billetera_destino.saldo += data.monto

    transaccion = Transaccion(
        billetera_origen=billetera_origen.id,
        billetera_destino=billetera_destino.id,
        monto=data.monto,
        tipo="p2p",
        estado="completada",
    )
    db.add(transaccion)
    db.commit()

    return {
        "mensaje": f"Transferencia de S/ {data.monto:.2f} a {destino.nombre} exitosa",
        "saldo_restante": float(billetera_origen.saldo),
    }


@router.get("/historial")
def historial(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    billetera = get_billetera(db, usuario)
    transacciones = (
        db.query(Transaccion)
        .filter(
            (Transaccion.billetera_origen == billetera.id)
            | (Transaccion.billetera_destino == billetera.id),
            # Los intentos de depósito rechazados no son movimientos de dinero.
            Transaccion.estado != "fallida",
        )
        .order_by(Transaccion.creado_en.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Contrapartes en un solo query (antes: 2 queries por transacción).
    otras_ids = set()
    for t in transacciones:
        es_salida = str(billetera.id) == str(t.billetera_origen)
        otra = t.billetera_destino if es_salida else t.billetera_origen
        if otra:
            otras_ids.add(otra)

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
    for t in transacciones:
        es_salida = str(billetera.id) == str(t.billetera_origen)
        otra_id = t.billetera_destino if es_salida else t.billetera_origen
        otro_usuario = contrapartes.get(str(otra_id)) if otra_id else None

        resultado.append({
            "id": str(t.id),
            "monto": float(t.monto),
            "tipo": t.tipo,
            "estado": t.estado,
            "es_salida": es_salida,
            "contraparte": otro_usuario.nombre if otro_usuario else None,
            "contraparte_email": otro_usuario.email if otro_usuario else None,
            "descripcion": t.descripcion,
            "fecha": iso_utc(t.creado_en),
        })

    return resultado
