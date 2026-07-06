"""Tests de depósitos (idempotencia, estados de Mercado Pago) y transferencias."""
from decimal import Decimal

from models import Billetera, Transaccion

import routes.billetera_routes as billetera_routes


def _saldo(db, usuario):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    db.refresh(billetera)
    return Decimal(billetera.saldo)


def _deposito_json(monto=50):
    return {
        "monto": monto,
        "mp_token": "tok-test",
        "payment_method_id": "visa",
        "identification_number": "12345678",
        "payer_email": "test@test.pe",
    }


def test_deposito_aprobado_acredita(client, usuario_actual, crear_usuario, db, monkeypatch):
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario

    capturado = {}

    def falso_pago(*args, **kwargs):
        capturado.update(kwargs)
        return {"estado": "aprobado", "exitoso": True, "id": "MP-001", "mensaje": "ok"}

    monkeypatch.setattr(billetera_routes, "crear_pago", falso_pago)

    res = client.post("/billetera/depositar", json=_deposito_json(50))
    assert res.status_code == 200
    assert res.json()["estado"] == "aprobado"
    assert _saldo(db, usuario) == 50

    # La clave de idempotencia es estable (el id de la transacción), no aleatoria.
    transaccion = db.query(Transaccion).filter(Transaccion.tipo == "deposito_mercadopago").first()
    assert capturado["idempotency_key"] == str(transaccion.id)
    assert capturado["external_reference"] == f"deposito-{transaccion.id}"
    assert transaccion.estado == "completada"
    assert transaccion.referencia_externa == "MP-001"


def test_deposito_rechazado_no_acredita(client, usuario_actual, crear_usuario, db, monkeypatch):
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario

    monkeypatch.setattr(
        billetera_routes, "crear_pago",
        lambda *a, **k: {"estado": "rechazado", "exitoso": False, "id": None,
                         "mensaje": "La tarjeta no tiene fondos suficientes."},
    )

    res = client.post("/billetera/depositar", json=_deposito_json(50))
    assert res.status_code == 400
    assert "fondos suficientes" in res.json()["detail"]
    assert _saldo(db, usuario) == 0

    transaccion = db.query(Transaccion).filter(Transaccion.tipo == "deposito_mercadopago").first()
    assert transaccion.estado == "fallida"


def test_deposito_sin_email_verificado(client, usuario_actual, crear_usuario):
    usuario_actual.usuario = crear_usuario(email_verificado=False)
    res = client.post("/billetera/depositar", json=_deposito_json())
    assert res.status_code == 403


def test_webhook_concilia_deposito_pendiente(client, usuario_actual, crear_usuario, db, monkeypatch):
    """Un depósito que quedó pendiente (o cuyo commit falló tras el cobro)
    se acredita al llegar el webhook — una sola vez, aunque llegue repetido."""
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario

    monkeypatch.setattr(
        billetera_routes, "crear_pago",
        lambda *a, **k: {"estado": "pendiente", "exitoso": False, "id": "MP-777", "mensaje": "en proceso"},
    )
    res = client.post("/billetera/depositar", json=_deposito_json(80))
    assert res.status_code == 200
    assert res.json()["estado"] == "pendiente"
    assert _saldo(db, usuario) == 0

    transaccion = db.query(Transaccion).filter(Transaccion.tipo == "deposito_mercadopago").first()
    monkeypatch.setattr(
        billetera_routes, "obtener_orden",
        lambda oid: {"id": "MP-777", "status": "processed",
                     "external_reference": f"deposito-{transaccion.id}"},
    )

    res = client.post("/billetera/webhook-mp", json={"data": {"id": "MP-777"}})
    assert res.json()["status"] == "acreditado"
    assert _saldo(db, usuario) == 80

    # Reintento del webhook: idempotente, no acredita de nuevo.
    res = client.post("/billetera/webhook-mp", json={"data": {"id": "MP-777"}})
    assert res.json()["status"] == "ya_procesado"
    assert _saldo(db, usuario) == 80


def test_transferencia_sin_saldo(client, usuario_actual, crear_usuario):
    origen = crear_usuario(saldo=10)
    destino = crear_usuario()
    usuario_actual.usuario = origen

    res = client.post("/billetera/transferir", json={"email_destino": destino.email, "monto": 50})
    assert res.status_code == 400


def test_transferencia_exitosa(client, usuario_actual, crear_usuario, db):
    origen = crear_usuario(saldo=100)
    destino = crear_usuario(saldo=5)
    usuario_actual.usuario = origen

    res = client.post("/billetera/transferir", json={"email_destino": destino.email, "monto": 40})
    assert res.status_code == 200
    assert _saldo(db, origen) == 60
    assert _saldo(db, destino) == 45


def test_no_autotransferencia(client, usuario_actual, crear_usuario):
    origen = crear_usuario(saldo=100)
    usuario_actual.usuario = origen
    res = client.post("/billetera/transferir", json={"email_destino": origen.email, "monto": 10})
    assert res.status_code == 400


def test_saldo_retenido_no_es_transferible(client, usuario_actual, crear_usuario):
    origen = crear_usuario(saldo=100)
    vendedor = crear_usuario()
    otro = crear_usuario()
    usuario_actual.usuario = origen

    res = client.post("/escrow/iniciar", json={
        "email_destino": vendedor.email, "monto": 90, "descripcion": "",
    })
    assert res.status_code == 200

    res = client.post("/billetera/transferir", json={"email_destino": otro.email, "monto": 50})
    assert res.status_code == 400


def test_procesar_vencidos_requiere_admin(client, usuario_actual, crear_usuario, monkeypatch):
    usuario_actual.usuario = crear_usuario()

    monkeypatch.delenv("ADMIN_API_KEY", raising=False)
    assert client.post("/escrow/procesar-vencidos").status_code == 503

    monkeypatch.setenv("ADMIN_API_KEY", "clave-secreta")
    res = client.post("/escrow/procesar-vencidos", headers={"X-Admin-Key": "incorrecta"})
    assert res.status_code == 403
