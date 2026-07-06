import os
from datetime import datetime, timezone
from decimal import Decimal

# Tope por operación (depósitos, transferencias y escrows), configurable por env.
MONTO_MAXIMO = Decimal(os.getenv("MONTO_MAXIMO", "10000"))


def utcnow() -> datetime:
    """Ahora en UTC naive (las columnas DateTime no llevan zona horaria),
    sin pasar por la API deprecada datetime.utcnow()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso_utc(dt: datetime | None) -> str | None:
    """Serializa datetimes almacenados como UTC naive en ISO 8601 con zona
    explícita, para que el navegador no los interprete como hora local."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
