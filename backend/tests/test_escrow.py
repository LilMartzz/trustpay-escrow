"""Tests de la máquina de estados del escrow: los bugs de dinero que
motivaron la auditoría (fondos bloqueados al confirmar expirado, cancelación
tras el envío, doble liberación)."""
from datetime import datetime, timedelta
from decimal import Decimal

from models import Billetera, Escrow, Envio


def _saldos(db, usuario):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    db.refresh(billetera)
    return Decimal(billetera.saldo), Decimal(billetera.saldo_retenido)


def _iniciar_escrow(client, usuario_actual, comprador, vendedor, monto=100):
    usuario_actual.usuario = comprador
    res = client.post("/escrow/iniciar", json={
        "email_destino": vendedor.email,
        "monto": monto,
        "descripcion": "test",
    })
    assert res.status_code == 200, res.text
    return res.json()["escrow_id"]


def test_iniciar_retiene_fondos(client, usuario_actual, crear_usuario, db):
    comprador = crear_usuario(saldo=500)
    vendedor = crear_usuario(saldo=0)
    _iniciar_escrow(client, usuario_actual, comprador, vendedor, 200)

    saldo, retenido = _saldos(db, comprador)
    assert saldo == 500
    assert retenido == 200


def test_no_puede_retener_mas_que_disponible(client, usuario_actual, crear_usuario):
    comprador = crear_usuario(saldo=100)
    vendedor = crear_usuario()
    _iniciar_escrow(client, usuario_actual, comprador, vendedor, 80)

    usuario_actual.usuario = comprador
    res = client.post("/escrow/iniciar", json={
        "email_destino": vendedor.email, "monto": 50, "descripcion": "",
    })
    assert res.status_code == 400
    assert "insuficiente" in res.json()["detail"].lower()


def test_confirmar_transfiere_al_vendedor(client, usuario_actual, crear_usuario, db):
    comprador = crear_usuario(saldo=300)
    vendedor = crear_usuario(saldo=10)
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor, 300)

    res = client.post(f"/escrow/confirmar/{escrow_id}")
    assert res.status_code == 200

    saldo_c, retenido_c = _saldos(db, comprador)
    saldo_v, _ = _saldos(db, vendedor)
    assert saldo_c == 0 and retenido_c == 0
    assert saldo_v == 310


def test_vendedor_no_puede_confirmar(client, usuario_actual, crear_usuario):
    comprador = crear_usuario()
    vendedor = crear_usuario()
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor)

    usuario_actual.usuario = vendedor
    res = client.post(f"/escrow/confirmar/{escrow_id}")
    assert res.status_code == 403


def test_tercero_no_accede_al_escrow(client, usuario_actual, crear_usuario):
    comprador = crear_usuario()
    vendedor = crear_usuario()
    intruso = crear_usuario()
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor)

    usuario_actual.usuario = intruso
    assert client.get(f"/escrow/estado/{escrow_id}").status_code == 403
    assert client.post(f"/escrow/confirmar/{escrow_id}").status_code == 403
    assert client.get(f"/chat/{escrow_id}").status_code == 403
    assert client.get(f"/evidencia/ver/{escrow_id}").status_code == 403


def test_doble_confirmacion_no_paga_dos_veces(client, usuario_actual, crear_usuario, db):
    comprador = crear_usuario(saldo=100)
    vendedor = crear_usuario(saldo=0)
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor, 100)

    assert client.post(f"/escrow/confirmar/{escrow_id}").status_code == 200
    assert client.post(f"/escrow/confirmar/{escrow_id}").status_code == 400

    saldo_v, _ = _saldos(db, vendedor)
    assert saldo_v == 100


def test_confirmar_expirado_libera_fondos(client, usuario_actual, crear_usuario, db):
    """Regresión del bug P0: confirmar tras expira_en dejaba el escrow en
    'expirado' con el saldo retenido para siempre."""
    comprador = crear_usuario(saldo=100)
    vendedor = crear_usuario(saldo=0)
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor, 100)

    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    escrow.expira_en = datetime.utcnow() - timedelta(hours=1)
    db.commit()

    res = client.post(f"/escrow/confirmar/{escrow_id}")
    assert res.status_code == 200

    saldo_c, retenido_c = _saldos(db, comprador)
    saldo_v, _ = _saldos(db, vendedor)
    assert (saldo_c, retenido_c) == (0, 0)
    assert saldo_v == 100


def test_cancelar_devuelve_fondos(client, usuario_actual, crear_usuario, db):
    comprador = crear_usuario(saldo=100)
    vendedor = crear_usuario()
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor, 60)

    res = client.post(f"/escrow/cancelar/{escrow_id}")
    assert res.status_code == 200

    saldo, retenido = _saldos(db, comprador)
    assert saldo == 100 and retenido == 0


def test_no_se_puede_cancelar_con_envio_despachado(client, usuario_actual, crear_usuario, db):
    """Regresión del fraude P0: el comprador cancelaba con el producto en
    camino y se quedaba con producto y dinero."""
    comprador = crear_usuario(saldo=100)
    vendedor = crear_usuario()
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor, 100)

    usuario_actual.usuario = vendedor
    res = client.post(f"/envio/{escrow_id}", json={
        "empresa": "Olva Courier", "numero_guia": "OLV123", "descripcion_producto": "",
    })
    assert res.status_code == 200

    usuario_actual.usuario = comprador
    res = client.post(f"/escrow/cancelar/{escrow_id}")
    assert res.status_code == 409

    _, retenido = _saldos(db, comprador)
    assert retenido == 100  # el escrow sigue vivo


def test_auto_liberacion_de_vencidos(client, usuario_actual, crear_usuario, db, SessionTest):
    from tasks import procesar_escrows_vencidos

    comprador = crear_usuario(saldo=100)
    vendedor = crear_usuario(saldo=0)
    escrow_id = _iniciar_escrow(client, usuario_actual, comprador, vendedor, 100)

    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    escrow.expira_en = datetime.utcnow() - timedelta(minutes=10)
    db.commit()

    procesar_escrows_vencidos(SessionTest)

    db.expire_all()
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    assert escrow.estado == "liberado"
    saldo_v, _ = _saldos(db, vendedor)
    assert saldo_v == 100


def test_escrow_id_invalido_es_404(client, usuario_actual, crear_usuario):
    usuario_actual.usuario = crear_usuario()
    assert client.get("/escrow/estado/no-es-un-uuid").status_code == 404


def test_montos_invalidos(client, usuario_actual, crear_usuario):
    comprador = crear_usuario(saldo=99999)
    vendedor = crear_usuario()
    usuario_actual.usuario = comprador

    for monto in [0, -5, "10.555", 999999]:
        res = client.post("/escrow/iniciar", json={
            "email_destino": vendedor.email, "monto": monto, "descripcion": "",
        })
        assert res.status_code == 422, f"monto={monto} debió rechazarse"
