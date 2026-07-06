import threading
import time
from utils import utcnow


def procesar_escrows_vencidos(SessionLocal):
    from models import Escrow, Transaccion, Billetera
    from notificaciones import enviar_notificacion

    db = SessionLocal()
    liberados = []
    try:
        ids_vencidos = [
            fila.id
            for fila in db.query(Escrow.id)
            .filter(Escrow.estado == "retenido", Escrow.expira_en < utcnow())
            .all()
        ]

        for escrow_id in ids_vencidos:
            try:
                # Bloquea la fila y re-verifica el estado: si el comprador está
                # confirmando/cancelando en este instante, uno de los dos espera
                # y el segundo ve el estado final (no hay doble liberación).
                escrow = (
                    db.query(Escrow)
                    .filter(Escrow.id == escrow_id, Escrow.estado == "retenido")
                    .with_for_update()
                    .first()
                )
                if not escrow or escrow.expira_en >= utcnow():
                    db.rollback()
                    continue

                transaccion = db.query(Transaccion).filter(
                    Transaccion.id == escrow.transaccion_id
                ).first()
                if not transaccion:
                    db.rollback()
                    continue

                billeteras = {}
                for bid in sorted({transaccion.billetera_origen, transaccion.billetera_destino}, key=str):
                    billeteras[bid] = (
                        db.query(Billetera).filter(Billetera.id == bid).with_for_update().first()
                    )
                origen = billeteras.get(transaccion.billetera_origen)
                destino = billeteras.get(transaccion.billetera_destino)
                if not origen or not destino:
                    db.rollback()
                    continue

                # Auto-liberación: transfiere al vendedor (mismo flujo que confirmar manual)
                origen.saldo -= escrow.monto_retenido
                origen.saldo_retenido -= escrow.monto_retenido
                destino.saldo += escrow.monto_retenido

                transaccion.estado = "completada"
                escrow.estado = "liberado"
                escrow.liberado_en = utcnow()

                db.commit()
                liberados.append((origen.usuario_id, destino.usuario_id, float(escrow.monto_retenido)))
            except Exception as e:
                db.rollback()
                print(f"[AutoRelease] Error en escrow {escrow_id}: {e}")

        if liberados:
            print(f"[AutoRelease] {len(liberados)} escrow(s) liberados automáticamente")
            for comprador_id, vendedor_id, monto in liberados:
                enviar_notificacion(db, comprador_id, "Escrow liberado automáticamente", f"Se confirmó el pago de S/ {monto:.2f} tras vencer el plazo")
                enviar_notificacion(db, vendedor_id, "Pago recibido", f"Recibiste S/ {monto:.2f} — se liberó automáticamente al vencer el plazo")

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
