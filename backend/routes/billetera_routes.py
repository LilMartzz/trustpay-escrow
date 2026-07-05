from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Billetera, Transaccion, Usuario
from dependencies import get_usuario_actual
from decimal import Decimal
from mercadopago_client import crear_pago

router = APIRouter(prefix="/billetera", tags=["billetera"])


@router.get("/saldo")
def ver_saldo(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    return {
        "usuario": usuario.nombre,
        "saldo": float(billetera.saldo),
        "saldo_retenido": float(billetera.saldo_retenido),
        "saldo_disponible": float(billetera.saldo - billetera.saldo_retenido),
    }


@router.post("/depositar")
def depositar(
    monto: float,
    mp_token: str,
    payment_method_id: str,
    identification_number: str,
    payer_email: str | None = None,
    payment_type_id: str = "credit_card",
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    # Mercado Pago rechaza la operación si payer.email pertenece a una cuenta real
    # de Mercado Pago cuando se opera con credenciales de cuentas de prueba
    # ("Unauthorized use of live credentials"), así que el email del pagador es el
    # del formulario de la tarjeta, no el de la sesión.
    pago = crear_pago(
        mp_token,
        monto,
        payer_email or usuario.email,
        payment_method_id,
        identification_number,
        payment_type_id=payment_type_id,
    )
    if not pago["exitoso"]:
        if pago["mensaje"] == "Mercado Pago no está configurado":
            raise HTTPException(status_code=503, detail=pago["mensaje"])
        raise HTTPException(status_code=400, detail=pago["mensaje"])

    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    billetera.saldo += Decimal(str(monto))

    transaccion = Transaccion(
        billetera_origen=None,
        billetera_destino=billetera.id,
        monto=monto,
        tipo="deposito_mercadopago",
        estado="completada",
        referencia_externa=pago["id"],
    )
    db.add(transaccion)
    db.commit()

    return {"mensaje": f"Depósito de S/ {monto:.2f} exitoso", "saldo": float(billetera.saldo)}


@router.post("/transferir")
def transferir(
    email_destino: str,
    monto: float,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    destino = db.query(Usuario).filter(Usuario.email == email_destino).first()
    if not destino:
        raise HTTPException(status_code=404, detail="Usuario destino no encontrado")
    if destino.id == usuario.id:
        raise HTTPException(status_code=400, detail="No puedes transferirte a ti mismo")

    billetera_origen = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    billetera_destino = db.query(Billetera).filter(Billetera.usuario_id == destino.id).first()

    disponible = float(billetera_origen.saldo - billetera_origen.saldo_retenido)
    if disponible < monto:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    billetera_origen.saldo -= Decimal(str(monto))
    billetera_destino.saldo += Decimal(str(monto))

    transaccion = Transaccion(
        billetera_origen=billetera_origen.id,
        billetera_destino=billetera_destino.id,
        monto=monto,
        tipo="p2p",
        estado="completada",
    )
    db.add(transaccion)
    db.commit()

    return {
        "mensaje": f"Transferencia de S/ {monto:.2f} a {destino.nombre} exitosa",
        "saldo_restante": float(billetera_origen.saldo),
    }


@router.get("/historial")
def historial(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    transacciones = (
        db.query(Transaccion)
        .filter(
            (Transaccion.billetera_origen == billetera.id)
            | (Transaccion.billetera_destino == billetera.id)
        )
        .order_by(Transaccion.creado_en.desc())
        .all()
    )

    resultado = []
    for t in transacciones:
        es_salida = str(billetera.id) == str(t.billetera_origen)

        # Resolve counterparty name
        otra_billetera_id = t.billetera_destino if es_salida else t.billetera_origen
        otra_billetera = db.query(Billetera).filter(Billetera.id == otra_billetera_id).first()
        contraparte = None
        if otra_billetera:
            otro_usuario = db.query(Usuario).filter(Usuario.id == otra_billetera.usuario_id).first()
            contraparte = otro_usuario.nombre if otro_usuario else None

        resultado.append({
            "id": str(t.id),
            "monto": float(t.monto),
            "tipo": t.tipo,
            "estado": t.estado,
            "es_salida": es_salida,
            "contraparte": contraparte,
            "descripcion": t.descripcion,
            "fecha": str(t.creado_en),
        })

    return resultado
