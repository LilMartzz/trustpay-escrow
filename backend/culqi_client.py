import os
import httpx

CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"


def crear_cargo(token: str, monto: float, email: str) -> dict:
    """Cobra un token de Culqi por el monto indicado (en soles).
    Devuelve {"exitoso": bool, "id": str | None, "mensaje": str}."""
    secret_key = os.getenv("CULQI_SECRET_KEY")
    if not secret_key:
        return {"exitoso": False, "id": None, "mensaje": "Culqi no está configurado"}

    payload = {
        "amount": int(round(monto * 100)),
        "currency_code": "PEN",
        "email": email,
        "source_id": token,
    }

    try:
        resp = httpx.post(
            CULQI_CHARGES_URL,
            json=payload,
            headers={"Authorization": f"Bearer {secret_key}"},
            timeout=15,
        )
    except httpx.HTTPError:
        return {"exitoso": False, "id": None, "mensaje": "No se pudo conectar con Culqi"}

    data = resp.json()

    if resp.status_code == 200 and data.get("object") == "charge":
        return {"exitoso": True, "id": data.get("id"), "mensaje": "Cargo exitoso"}

    mensaje = data.get("user_message") or data.get("merchant_message") or "El pago fue rechazado"
    return {"exitoso": False, "id": None, "mensaje": mensaje}
