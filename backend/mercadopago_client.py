import os
import mercadopago

_sdk = None


def _get_sdk():
    global _sdk
    if _sdk is None:
        access_token = os.getenv("MP_ACCESS_TOKEN")
        if not access_token:
            return None
        _sdk = mercadopago.SDK(access_token)
    return _sdk


def crear_pago(
    token: str,
    monto: float,
    email: str,
    payment_method_id: str,
    identification_number: str,
    identification_type: str = "DNI",
) -> dict:
    """Cobra un token de Mercado Pago por el monto indicado (en soles).
    Devuelve {"exitoso": bool, "id": str | None, "mensaje": str}."""
    sdk = _get_sdk()
    if sdk is None:
        return {"exitoso": False, "id": None, "mensaje": "Mercado Pago no está configurado"}

    payload = {
        "transaction_amount": monto,
        "token": token,
        "description": "Depósito TrustPay",
        "installments": 1,
        "payment_method_id": payment_method_id,
        "payer": {
            "email": email,
            "identification": {"type": identification_type, "number": identification_number},
        },
    }

    try:
        resultado = sdk.payment().create(payload)
    except Exception:
        return {"exitoso": False, "id": None, "mensaje": "No se pudo conectar con Mercado Pago"}

    body = resultado.get("response", {})

    if resultado.get("status") in (200, 201) and body.get("status") == "approved":
        return {"exitoso": True, "id": str(body.get("id")), "mensaje": "Pago exitoso"}

    mensaje = body.get("status_detail") or body.get("message") or "El pago fue rechazado"
    return {"exitoso": False, "id": None, "mensaje": mensaje}
