"""Tests del ledger de doble entrada, la verificación de saldos y los retiros."""
from decimal import Decimal

import pytest

from models import AsientoContable, Billetera, Transaccion

import routes.billetera_routes as billetera_routes


def _saldo(db, usuario):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    db.refresh(billetera)
    return Decimal(billetera.saldo)


def _depositar(client, monkeypatch, monto, referencia="MP-LEDGER"):
    monkeypatch.setattr(
        billetera_routes, "crear_pago",
        lambda *a, **k: {"estado": "aprobado", "exitoso": True, "id": referencia, "mensaje": "ok"},
    )
    res = client.post("/billetera/depositar", json={
        "monto": monto,
        "mp_token": "tok-test",
        "payment_method_id": "visa",
        "identification_number": "12345678",
        "payer_email": "test@test.pe",
    })
    assert res.status_code == 200, res.text
    return res


def _verificar(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "clave-test")
    res = client.get("/admin/verificar-ledger", headers={"X-Admin-Key": "clave-test"})
    assert res.status_code == 200, res.text
    return res.json()


def _inicializar(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "clave-test")
    res = client.post("/admin/inicializar-ledger", headers={"X-Admin-Key": "clave-test"})
    assert res.status_code == 200, res.text
    return res.json()


def test_deposito_genera_asientos_balanceados(client, usuario_actual, crear_usuario, db, monkeypatch):
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 100, referencia="MP-A1")

    transaccion = db.query(Transaccion).filter(Transaccion.tipo == "deposito_mercadopago").first()
    asientos = db.query(AsientoContable).filter(AsientoContable.transaccion_id == transaccion.id).all()
    assert len(asientos) == 2
    assert sum(Decimal(a.monto) for a in asientos) == 0

    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    montos = {(a.billetera_id, a.cuenta_sistema): Decimal(a.monto) for a in asientos}
    assert montos[(billetera.id, None)] == 100
    assert montos[(None, "mercadopago")] == -100


def test_flujo_completo_cuadra_con_el_ledger(client, usuario_actual, crear_usuario, db, monkeypatch):
    """Depósito + transferencia + escrow confirmado: el saldo derivado del
    ledger coincide con billetera.saldo para todos los involucrados."""
    ana = crear_usuario(saldo=0, verificado="verificado")
    beto = crear_usuario(saldo=0)
    carla = crear_usuario(saldo=0)

    usuario_actual.usuario = ana
    _depositar(client, monkeypatch, 500, referencia="MP-B1")

    res = client.post("/billetera/transferir", json={"email_destino": beto.email, "monto": 120})
    assert res.status_code == 200

    res = client.post("/escrow/iniciar", json={
        "email_destino": carla.email, "monto": 200, "descripcion": "venta",
    })
    assert res.status_code == 200
    escrow_id = res.json()["escrow_id"]
    assert client.post(f"/escrow/confirmar/{escrow_id}").status_code == 200

    assert (_saldo(db, ana), _saldo(db, beto), _saldo(db, carla)) == (180, 120, 200)

    reporte = _verificar(client, monkeypatch)
    assert reporte["consistente"] is True
    assert reporte["discrepancias"] == []
    assert reporte["movimientos_descuadrados"] == []
    # Todo el dinero entró por Mercado Pago: la cuenta del sistema respalda
    # exactamente lo que hay en las billeteras (suma global cero).
    assert reporte["suma_global_asientos"] == 0


def test_verificacion_detecta_saldo_corrupto(client, usuario_actual, crear_usuario, db, monkeypatch):
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 100, referencia="MP-C1")

    # Corrupción simulada: alguien muta el saldo sin pasar por el ledger.
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    billetera.saldo = Decimal("999")
    db.commit()

    reporte = _verificar(client, monkeypatch)
    assert reporte["consistente"] is False
    assert len(reporte["discrepancias"]) == 1
    d = reporte["discrepancias"][0]
    assert d["saldo_registrado"] == 999
    assert d["saldo_derivado"] == 100
    assert d["diferencia"] == 899


def test_asientos_son_inmutables(client, usuario_actual, crear_usuario, db, monkeypatch):
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 50, referencia="MP-D1")

    asiento = db.query(AsientoContable).first()
    asiento.monto = Decimal("9999")
    with pytest.raises(Exception, match="inmutables"):
        db.commit()
    db.rollback()

    asiento = db.query(AsientoContable).first()
    db.delete(asiento)
    with pytest.raises(Exception, match="inmutables"):
        db.commit()
    db.rollback()


def test_retiro_exitoso_descuenta_y_asienta(client, usuario_actual, crear_usuario, db, monkeypatch):
    usuario = crear_usuario(saldo=0, verificado="verificado")
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 300, referencia="MP-E1")

    res = client.post("/billetera/retirar", json={
        "monto": 120, "banco": "BCP", "cuenta_destino": "19112345678901234567",
    })
    assert res.status_code == 200, res.text
    assert res.json()["saldo"] == 180
    assert _saldo(db, usuario) == 180

    transaccion = db.query(Transaccion).filter(Transaccion.tipo == "retiro").first()
    assert transaccion.estado == "completada"
    assert transaccion.billetera_destino is None
    assert "****4567" in transaccion.descripcion

    asientos = db.query(AsientoContable).filter(AsientoContable.transaccion_id == transaccion.id).all()
    assert sum(Decimal(a.monto) for a in asientos) == 0
    assert any(a.cuenta_sistema == "retiros" and Decimal(a.monto) == 120 for a in asientos)

    reporte = _verificar(client, monkeypatch)
    assert reporte["consistente"] is True


def test_retiro_sin_saldo_disponible(client, usuario_actual, crear_usuario, monkeypatch):
    usuario = crear_usuario(saldo=0, verificado="verificado")
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 100, referencia="MP-F1")

    res = client.post("/billetera/retirar", json={
        "monto": 150, "banco": "BCP", "cuenta_destino": "1911234567",
    })
    assert res.status_code == 400


def test_retiro_no_toca_saldo_retenido_en_escrow(client, usuario_actual, crear_usuario, db, monkeypatch):
    comprador = crear_usuario(saldo=0, verificado="verificado")
    vendedor = crear_usuario()
    usuario_actual.usuario = comprador
    _depositar(client, monkeypatch, 100, referencia="MP-G1")

    res = client.post("/escrow/iniciar", json={
        "email_destino": vendedor.email, "monto": 80, "descripcion": "",
    })
    assert res.status_code == 200

    # Solo quedan S/ 20 disponibles: el retiro de 50 debe rechazarse.
    res = client.post("/billetera/retirar", json={
        "monto": 50, "banco": "BCP", "cuenta_destino": "1911234567",
    })
    assert res.status_code == 400
    assert _saldo(db, comprador) == 100


def test_retiro_requiere_identidad_verificada(client, usuario_actual, crear_usuario, monkeypatch):
    usuario = crear_usuario(saldo=0)  # email verificado, identidad no
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 100, referencia="MP-H1")

    res = client.post("/billetera/retirar", json={
        "monto": 50, "banco": "BCP", "cuenta_destino": "1911234567",
    })
    assert res.status_code == 403
    assert "identidad" in res.json()["detail"].lower()


def test_auto_liberacion_tambien_asienta(client, usuario_actual, crear_usuario, db, SessionTest, monkeypatch):
    from datetime import timedelta
    from tasks import procesar_escrows_vencidos
    from utils import utcnow
    from models import Escrow

    comprador = crear_usuario(saldo=0)
    vendedor = crear_usuario(saldo=0)
    usuario_actual.usuario = comprador
    _depositar(client, monkeypatch, 100, referencia="MP-I1")

    res = client.post("/escrow/iniciar", json={
        "email_destino": vendedor.email, "monto": 100, "descripcion": "",
    })
    assert res.status_code == 200
    escrow_id = res.json()["escrow_id"]

    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    escrow.expira_en = utcnow() - timedelta(minutes=5)
    db.commit()

    procesar_escrows_vencidos(SessionTest)

    reporte = _verificar(client, monkeypatch)
    assert reporte["consistente"] is True
    assert _saldo(db, vendedor) == 100


def test_inicializar_ledger_concilia_billetera_huerfana(client, crear_usuario, db, monkeypatch):
    """Una billetera con saldo previo al ledger (saldo pero sin asientos) queda
    conciliada con un asiento de apertura y el ledger vuelve a ser consistente."""
    usuario = crear_usuario(saldo=500)

    previo = _verificar(client, monkeypatch)
    assert previo["consistente"] is False
    assert len(previo["discrepancias"]) == 1
    assert "sin asientos" in previo["discrepancias"][0]["nota"]

    resultado = _inicializar(client, monkeypatch)
    assert len(resultado["conciliadas"]) == 1
    assert resultado["conciliadas"][0]["saldo"] == 500
    assert resultado["verificacion"]["consistente"] is True
    assert resultado["verificacion"]["discrepancias"] == []

    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    asientos_billetera = db.query(AsientoContable).filter(AsientoContable.billetera_id == billetera.id).all()
    assert len(asientos_billetera) == 1
    assert Decimal(asientos_billetera[0].monto) == 500

    # La contrapartida es la cuenta de sistema de apertura, con signo opuesto.
    apertura = db.query(AsientoContable).filter(AsientoContable.cuenta_sistema == "apertura").all()
    assert len(apertura) == 1
    assert Decimal(apertura[0].monto) == -500

    transaccion = db.query(Transaccion).filter(Transaccion.tipo == "apertura").first()
    assert transaccion is not None
    assert transaccion.billetera_destino == billetera.id


def test_inicializar_ledger_es_idempotente(client, crear_usuario, db, monkeypatch):
    """Re-ejecutar la inicialización no crea asientos duplicados: las billeteras
    ya conciliadas tienen asientos y quedan excluidas."""
    crear_usuario(saldo=250)

    primero = _inicializar(client, monkeypatch)
    assert len(primero["conciliadas"]) == 1
    total_tras_primero = db.query(AsientoContable).count()
    assert total_tras_primero == 2  # asiento de billetera + apertura

    segundo = _inicializar(client, monkeypatch)
    assert segundo["conciliadas"] == []
    assert db.query(AsientoContable).count() == total_tras_primero
    assert segundo["verificacion"]["consistente"] is True


def test_inicializar_ledger_concilia_saldo_previo_parcial(client, usuario_actual, crear_usuario, db, monkeypatch):
    """Billetera que ya tiene asientos (un depósito) pero arrastra un saldo
    previo al ledger: la apertura concilia solo la diferencia, no todo el saldo."""
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 100, referencia="MP-PREV")

    # Simula el saldo previo al ledger: la billetera tenía 150 extra de antes.
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    billetera.saldo = Decimal("250")  # el ledger deriva 100; 150 son previos
    db.commit()

    previo = _verificar(client, monkeypatch)
    assert previo["consistente"] is False

    resultado = _inicializar(client, monkeypatch)
    assert len(resultado["conciliadas"]) == 1
    assert resultado["conciliadas"][0]["ajuste"] == 150
    assert resultado["verificacion"]["consistente"] is True

    # La apertura fue por la diferencia (150), no por el saldo completo (250).
    apertura = db.query(AsientoContable).filter(AsientoContable.cuenta_sistema == "apertura").all()
    assert len(apertura) == 1
    assert Decimal(apertura[0].monto) == -150

    # Re-ejecutar no vuelve a tocarla.
    segundo = _inicializar(client, monkeypatch)
    assert segundo["conciliadas"] == []


def test_inicializar_ledger_ignora_billeteras_sin_saldo(client, crear_usuario, db, monkeypatch):
    """Una billetera en cero no necesita apertura (registrar_asientos rechaza
    montos cero); no debe generar ningún asiento."""
    crear_usuario(saldo=0)

    resultado = _inicializar(client, monkeypatch)
    assert resultado["conciliadas"] == []
    assert db.query(AsientoContable).count() == 0
    assert resultado["verificacion"]["consistente"] is True


def test_admin_lista_asientos(client, usuario_actual, crear_usuario, monkeypatch):
    usuario = crear_usuario(saldo=0)
    usuario_actual.usuario = usuario
    _depositar(client, monkeypatch, 120, referencia="MP-LISTA")

    monkeypatch.setenv("ADMIN_API_KEY", "clave-test")
    res = client.get("/admin/asientos", headers={"X-Admin-Key": "clave-test"})
    assert res.status_code == 200
    asientos = res.json()
    assert len(asientos) == 2  # doble entrada: billetera + cuenta sistema

    cuentas = {a["cuenta"] for a in asientos}
    assert usuario.email in cuentas
    assert "sistema:mercadopago" in cuentas
    assert sum(a["monto"] for a in asientos) == 0
    assert all(a["tipo"] == "deposito_mercadopago" for a in asientos)
