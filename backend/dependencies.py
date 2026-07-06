import hmac
import os
import time
import uuid
from collections import defaultdict, deque

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Billetera, Transaccion, Escrow

security = HTTPBearer()


def verificar_id_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        return firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def get_usuario_actual(
    decoded_token: dict = Depends(verificar_id_token),
    db: Session = Depends(get_db),
) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.firebase_uid == decoded_token["uid"]).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


def requiere_email_verificado(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    """Gate para operaciones con dinero: exige el correo verificado en Firebase."""
    if not usuario.email_verificado:
        raise HTTPException(
            status_code=403,
            detail="Verifica tu correo electrónico antes de operar con dinero",
        )
    return usuario


def requiere_admin(x_admin_key: str = Header(None)):
    """Valida el header X-Admin-Key contra ADMIN_API_KEY en tiempo constante."""
    clave = os.getenv("ADMIN_API_KEY")
    if not clave:
        raise HTTPException(status_code=503, detail="Panel admin no configurado (falta ADMIN_API_KEY)")
    if not (x_admin_key and hmac.compare_digest(x_admin_key, clave)):
        raise HTTPException(status_code=403, detail="Clave de administrador inválida")


def parse_uuid(valor: str, detalle: str = "Recurso no encontrado") -> uuid.UUID:
    """Convierte el path param a UUID; un id malformado es un 404, no un 500."""
    try:
        return uuid.UUID(str(valor))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail=detalle)


def get_billetera(db: Session, usuario: Usuario) -> Billetera:
    """Billetera del usuario; si un sync a medias la dejó sin crear, la repara."""
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    if billetera is None:
        billetera = Billetera(usuario_id=usuario.id)
        db.add(billetera)
        db.commit()
        db.refresh(billetera)
    return billetera


def bloquear_billeteras(db: Session, *billetera_ids) -> dict:
    """SELECT ... FOR UPDATE sobre las billeteras, siempre en el mismo orden
    (por id) para evitar deadlocks. Devuelve {id: Billetera}."""
    resultado = {}
    for bid in sorted(set(billetera_ids), key=str):
        fila = (
            db.query(Billetera)
            .filter(Billetera.id == bid)
            .with_for_update()
            .first()
        )
        if fila is None:
            raise HTTPException(status_code=409, detail="Billetera no encontrada")
        resultado[bid] = fila
    return resultado


def contexto_escrow(escrow_id: str, usuario: Usuario, db: Session, bloquear: bool = False):
    """Carga escrow + transacción y verifica que el usuario sea parte.
    Reemplaza los _verificar_participante duplicados en cada módulo de rutas.
    Devuelve (escrow, transaccion, billetera_usuario, es_comprador, es_vendedor)."""
    eid = parse_uuid(escrow_id, "Escrow no encontrado")
    consulta = db.query(Escrow).filter(Escrow.id == eid)
    if bloquear:
        consulta = consulta.with_for_update()
    escrow = consulta.first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")

    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    if not transaccion:
        raise HTTPException(status_code=409, detail="Operación inconsistente: escrow sin transacción")

    billetera = get_billetera(db, usuario)
    es_comprador = str(billetera.id) == str(transaccion.billetera_origen)
    es_vendedor = str(billetera.id) == str(transaccion.billetera_destino)
    if not es_comprador and not es_vendedor:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta operación")

    return escrow, transaccion, billetera, es_comprador, es_vendedor


class _RateLimiter:
    """Limitador de ventana deslizante en memoria. Suficiente para el worker
    único actual; con múltiples workers habría que moverlo a Redis."""

    def __init__(self):
        self._eventos: dict[str, deque] = defaultdict(deque)

    def verificar(self, clave: str, max_llamadas: int, ventana_seg: float):
        ahora = time.monotonic()
        cola = self._eventos[clave]
        while cola and ahora - cola[0] > ventana_seg:
            cola.popleft()
        if len(cola) >= max_llamadas:
            raise HTTPException(
                status_code=429,
                detail="Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
            )
        cola.append(ahora)


rate_limiter = _RateLimiter()
