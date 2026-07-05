import os
import uuid
import httpx

# Se usa la API de Órdenes (POST /v1/orders) en lugar de la API de Pagos legacy
# (POST /v1/payments): esta última rechaza las credenciales APP_USR- de las
# cuentas de prueba con "Unauthorized use of live credentials" (cause code 7),
# mientras que Órdenes procesa los mismos tokens y credenciales sin problema.
ORDERS_URL = "https://api.mercadopago.com/v1/orders"


def crear_pago(
    token: str,
    monto: float,
    email: str,
    payment_method_id: str,
    identification_number: str,
    identification_type: str = "DNI",
    payment_type_id: str = "credit_card",
) -> dict:
    """Cobra un token de Mercado Pago por el monto indicado (en soles).
    Devuelve {"exitoso": bool, "id": str | None, "mensaje": str}."""
    access_token = os.getenv("MP_ACCESS_TOKEN")
    if not access_token:
        return {"exitoso": False, "id": None, "mensaje": "Mercado Pago no está configurado"}

    payload = {
        "type": "online",
        "processing_mode": "automatic",
        "total_amount": f"{monto:.2f}",
        "external_reference": f"deposito-{uuid.uuid4().hex[:12]}",
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
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Idempotency-Key": str(uuid.uuid4()),
    }

    try:
        respuesta = httpx.post(ORDERS_URL, json=payload, headers=headers, timeout=30)
        body = respuesta.json()
    except (httpx.HTTPError, ValueError):
        return {"exitoso": False, "id": None, "mensaje": "No se pudo conectar con Mercado Pago"}

    # En orden exitosa el body es la orden; en rechazo viene {"errors": [...], "data": {orden}}.
    orden = body.get("data", body)

    if respuesta.status_code in (200, 201) and orden.get("status") == "processed":
        return {"exitoso": True, "id": str(orden.get("id")), "mensaje": "Pago exitoso"}

    pagos = (orden.get("transactions") or {}).get("payments") or []
    detalle = pagos[0].get("status_detail") if pagos else None
    errores = body.get("errors") or []
    mensaje = detalle or (errores[0].get("message") if errores else None) or body.get("message") or "El pago fue rechazado"
    return {"exitoso": False, "id": None, "mensaje": mensaje}
