import os
import httpx

# Se usa la API de Órdenes (POST /v1/orders) en lugar de la API de Pagos legacy
# (POST /v1/payments): esta última rechaza las credenciales APP_USR- de las
# cuentas de prueba con "Unauthorized use of live credentials" (cause code 7),
# mientras que Órdenes procesa los mismos tokens y credenciales sin problema.
ORDERS_URL = "https://api.mercadopago.com/v1/orders"

# Estados finales de una orden que significan que el cobro NO va a suceder.
_ESTADOS_RECHAZO = {"failed", "canceled", "cancelled", "expired", "refunded"}

# Traducción de los status_detail crudos de Mercado Pago a mensajes accionables.
MENSAJES_RECHAZO = {
    "cc_rejected_bad_filled_card_number": "Revisa el número de tarjeta: parece incorrecto.",
    "cc_rejected_bad_filled_date": "Revisa la fecha de vencimiento de la tarjeta.",
    "cc_rejected_bad_filled_security_code": "Revisa el código de seguridad (CVV).",
    "cc_rejected_bad_filled_other": "Alguno de los datos de la tarjeta es incorrecto. Revísalos.",
    "cc_rejected_insufficient_amount": "La tarjeta no tiene fondos suficientes.",
    "cc_rejected_call_for_authorize": "Tu banco necesita que autorices este pago. Llámalo e intenta de nuevo.",
    "cc_rejected_card_disabled": "La tarjeta está inhabilitada. Comunícate con tu banco.",
    "cc_rejected_card_error": "No pudimos procesar la tarjeta. Intenta de nuevo.",
    "cc_rejected_duplicated_payment": "Ya hiciste un pago por este monto hace un momento. Si necesitas repetirlo, espera unos minutos.",
    "cc_rejected_high_risk": "El pago fue rechazado por seguridad. Prueba con otro medio de pago.",
    "cc_rejected_max_attempts": "Superaste el número de intentos permitidos. Espera un momento.",
    "cc_rejected_blacklist": "El pago fue rechazado. Prueba con otra tarjeta.",
    "cc_rejected_other_reason": "La tarjeta rechazó el pago. Intenta con otra tarjeta.",
    "rejected_by_issuer": "Tu banco rechazó el pago. Intenta con otra tarjeta o contáctalo.",
    "rejected_by_regulations": "El pago fue rechazado por regulaciones vigentes.",
    "insufficient_amount": "La tarjeta no tiene fondos suficientes.",
}


def _traducir(detalle: str | None, respaldo: str | None = None) -> str:
    if detalle and detalle in MENSAJES_RECHAZO:
        return MENSAJES_RECHAZO[detalle]
    return respaldo or detalle or "El pago fue rechazado"


def crear_pago(
    token: str,
    monto,
    email: str,
    payment_method_id: str,
    identification_number: str,
    identification_type: str = "DNI",
    payment_type_id: str = "credit_card",
    external_reference: str | None = None,
    idempotency_key: str | None = None,
) -> dict:
    """Cobra un token de Mercado Pago por el monto indicado (en soles).

    `idempotency_key` debe ser estable por intento de depósito (no aleatorio):
    si la request se reintenta, Mercado Pago devuelve la misma orden en lugar
    de cobrar dos veces. `external_reference` enlaza la orden con nuestra
    transacción pendiente para poder conciliar por webhook.

    Devuelve {"estado": "aprobado"|"pendiente"|"rechazado"|"error",
              "exitoso": bool, "id": str | None, "mensaje": str}.
    """
    access_token = os.getenv("MP_ACCESS_TOKEN")
    if not access_token:
        return {"estado": "error", "exitoso": False, "id": None, "mensaje": "Mercado Pago no está configurado"}

    payload = {
        "type": "online",
        "processing_mode": "automatic",
        "total_amount": f"{monto:.2f}",
        "external_reference": external_reference,
        "payer": {
            "email": email,
            "identification": {"type": identification_type, "number": identification_number},
        },
        "transactions": {
            "payments": [
                {
                    "amount": f"{monto:.2f}",
                    "payment_method": {
                        "id": payment_method_id,
                        "type": payment_type_id,
                        "token": token,
                        "installments": 1,
                    },
                }
            ]
        },
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key

    try:
        respuesta = httpx.post(ORDERS_URL, json=payload, headers=headers, timeout=30)
        body = respuesta.json()
    except (httpx.HTTPError, ValueError):
        return {"estado": "error", "exitoso": False, "id": None,
                "mensaje": "No se pudo conectar con Mercado Pago. Tu tarjeta no fue cobrada; intenta de nuevo."}

    # En orden exitosa el body es la orden; en rechazo viene {"errors": [...], "data": {orden}}.
    orden = body.get("data", body)
    status = (orden.get("status") or "").lower()
    orden_id = str(orden.get("id")) if orden.get("id") else None

    if respuesta.status_code in (200, 201) and status == "processed":
        return {"estado": "aprobado", "exitoso": True, "id": orden_id, "mensaje": "Pago exitoso"}

    pagos = (orden.get("transactions") or {}).get("payments") or []
    detalle = pagos[0].get("status_detail") if pagos else None
    errores = body.get("errors") or []
    respaldo = (errores[0].get("message") if errores else None) or body.get("message")

    # Orden creada pero aún sin resolución (in_process / action_required):
    # NO es un rechazo — el webhook la conciliará cuando MP la resuelva.
    if respuesta.status_code in (200, 201) and orden_id and status not in _ESTADOS_RECHAZO and not errores:
        return {"estado": "pendiente", "exitoso": False, "id": orden_id,
                "mensaje": "Tu pago está siendo procesado por Mercado Pago. Se acreditará automáticamente al confirmarse."}

    return {"estado": "rechazado", "exitoso": False, "id": orden_id, "mensaje": _traducir(detalle, respaldo)}


def obtener_orden(orden_id: str) -> dict | None:
    """Consulta una orden en Mercado Pago (conciliación vía webhook).
    Devuelve la orden o None si no se pudo obtener."""
    access_token = os.getenv("MP_ACCESS_TOKEN")
    if not access_token:
        return None
    try:
        respuesta = httpx.get(
            f"{ORDERS_URL}/{orden_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        if respuesta.status_code != 200:
            return None
        return respuesta.json()
    except (httpx.HTTPError, ValueError):
        return None
