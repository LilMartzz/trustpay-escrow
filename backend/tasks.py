import threading
import time
from datetime import datetime
from decimal import Decimal


def procesar_escrows_vencidos(SessionLocal):
    from models import Escrow, Transaccion, Billetera

    db = SessionLocal()
    try:
        vencidos = (
            db.query(Escrow)
            .filter(Escrow.estado == "retenido", Escrow.expira_en < datetime.utcnow())
            .all()
        )

        for escrow in vencidos:
            transaccion = db.query(Transaccion).filter(
                Transaccion.id == escrow.transaccion_id
            ).first()
            if not transaccion:
                continue

            billetera_origen = db.query(Billetera).filter(
                Billetera.id == transaccion.billetera_origen
            ).first()
            billetera_destino = db.query(Billetera).filter(
                Billetera.id == transaccion.billetera_destino
            ).first()
            if not billetera_origen or not billetera_destino:
                continue

            # Auto-liberación: transfiere al vendedor (mismo flujo que confirmar manual)
            billetera_origen.saldo -= escrow.monto_retenido
            billetera_origen.saldo_retenido -= escrow.monto_retenido
            billetera_destino.saldo += escrow.monto_retenido

            transaccion.estado = "completada"
            escrow.estado = "liberado"
            escrow.liberado_en = datetime.utcnow()

        if vencidos:
            db.commit()
            print(f"[AutoRelease] {len(vencidos)} escrow(s) liberados automáticamente")

    except Exception as e:
        db.rollback()
        print(f"[AutoRelease] Error: {e}")
    finally:
        db.close()


def iniciar_scheduler(SessionLocal):
    def loop():
        while True:
            try:
                procesar_escrows_vencidos(SessionLocal)
            except Exception as e:
                print(f"[Scheduler] Error inesperado: {e}")
            time.sleep(300)  # cada 5 minutos

    hilo = threading.Thread(target=loop, daemon=True)
    hilo.start()
    print("[Scheduler] Auto-release de escrows iniciado (intervalo: 5 min)")
