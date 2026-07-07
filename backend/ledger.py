"""Registro y auditoría del ledger de doble entrada (asientos_contables).

Convención de signos: cada asiento aplica su monto a la cuenta que nombra,
positivo acredita y negativo debita. Los asientos de un mismo movimiento
(misma transaccion_id) deben sumar cero.

Cuentas del sistema (contrapartida de dinero que entra o sale de la app):
  - "mercadopago": origen de los depósitos acreditados.
  - "retiros": destino de los retiros (payout).
"""
import uuid
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import AsientoContable, Billetera

CUENTA_MERCADOPAGO = "mercadopago"
CUENTA_RETIROS = "retiros"


def registrar_asientos(db: Session, transaccion_id, asientos):
    """Agrega los asientos de un movimiento a la sesión (sin commit: se
    persisten en la misma transacción que el cambio de saldo, o ninguno).

    asientos: iterable de (cuenta, monto) donde cuenta es el UUID de una
    billetera o el nombre de una cuenta del sistema. Rechaza movimientos
    que no cuadran (suma distinta de cero) o con patas en cero."""
    filas = []
    total = Decimal("0")
    for cuenta, monto in asientos:
        monto = Decimal(monto)
        if monto == 0:
            raise ValueError("Un asiento no puede ser de monto cero")
        total += monto
        if isinstance(cuenta, uuid.UUID):
            filas.append(AsientoContable(transaccion_id=transaccion_id, billetera_id=cuenta, monto=monto))
        else:
            filas.append(AsientoContable(transaccion_id=transaccion_id, cuenta_sistema=str(cuenta), monto=monto))

    if len(filas) < 2:
        raise ValueError("Un movimiento requiere al menos dos asientos (doble entrada)")
    if total != 0:
        raise ValueError(f"Asientos descuadrados para transacción {transaccion_id}: suman {total}")

    db.add_all(filas)


def saldo_derivado(db: Session, billetera_id) -> Decimal:
    """Saldo de una billetera según el ledger (suma de sus asientos)."""
    total = (
        db.query(func.coalesce(func.sum(AsientoContable.monto), 0))
        .filter(AsientoContable.billetera_id == billetera_id)
        .scalar()
    )
    return Decimal(total)


def verificar_ledger(db: Session) -> dict:
    """Audita el ledger contra los saldos mutables de billetera.

    Detecta: (a) movimientos cuyos asientos no suman cero, (b) billeteras
    cuyo saldo no coincide con el derivado del ledger. Las billeteras con
    saldo previo a la existencia del ledger aparecen como discrepancia — el
    campo 'nota' de cada una ayuda a distinguir corrupción de saldo histórico."""
    suma_global = Decimal(
        db.query(func.coalesce(func.sum(AsientoContable.monto), 0)).scalar()
    )

    movimientos_descuadrados = [
        {"transaccion_id": str(tid), "suma": float(suma)}
        for tid, suma in (
            db.query(AsientoContable.transaccion_id, func.sum(AsientoContable.monto))
            .group_by(AsientoContable.transaccion_id)
            .having(func.sum(AsientoContable.monto) != 0)
            .all()
        )
    ]

    derivados = dict(
        db.query(AsientoContable.billetera_id, func.sum(AsientoContable.monto))
        .filter(AsientoContable.billetera_id.isnot(None))
        .group_by(AsientoContable.billetera_id)
        .all()
    )

    discrepancias = []
    total_billeteras = 0
    for billetera in db.query(Billetera).all():
        total_billeteras += 1
        derivado = Decimal(derivados.get(billetera.id, 0))
        saldo = Decimal(billetera.saldo or 0)
        if saldo != derivado:
            tiene_asientos = billetera.id in derivados
            discrepancias.append({
                "billetera_id": str(billetera.id),
                "usuario_id": str(billetera.usuario_id),
                "saldo_registrado": float(saldo),
                "saldo_derivado": float(derivado),
                "diferencia": float(saldo - derivado),
                "nota": (
                    "descuadre entre ledger y saldo" if tiene_asientos
                    else "billetera sin asientos (saldo previo al ledger o corrupción)"
                ),
            })

    return {
        "consistente": not discrepancias and not movimientos_descuadrados and suma_global == 0,
        "suma_global_asientos": float(suma_global),
        "billeteras_auditadas": total_billeteras,
        "movimientos_descuadrados": movimientos_descuadrados,
        "discrepancias": discrepancias,
    }
