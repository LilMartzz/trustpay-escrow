from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Billetera, Transaccion, Usuario
from auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from decimal import Decimal

router = APIRouter(prefix="/billetera", tags=["billetera"])
security = HTTPBearer()

def get_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    usuario = db.query(Usuario).filter(Usuario.id == payload["sub"]).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.get("/saldo")
def ver_saldo(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    return {
        "usuario": usuario.nombre,
        "saldo": float(billetera.saldo),
        "saldo_retenido": float(billetera.saldo_retenido),
        "saldo_disponible": float(billetera.saldo - billetera.saldo_retenido)
    }

@router.post("/depositar")
def depositar(monto: float, usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    billetera.saldo += Decimal(str(monto))
    db.commit()
    return {"mensaje": f"Depósito de S/ {monto} exitoso", "saldo": float(billetera.saldo)}

@router.post("/transferir")
def transferir(
    email_destino: str,
    monto: float,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
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
        estado="completada"
    )
    db.add(transaccion)
    db.commit()

    return {
        "mensaje": f"Transferencia de S/ {monto} a {destino.nombre} exitosa",
        "saldo_restante": float(billetera_origen.saldo)
    }

@router.get("/historial")
def historial(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    billetera = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    transacciones = db.query(Transaccion).filter(
        (Transaccion.billetera_origen == billetera.id) |
        (Transaccion.billetera_destino == billetera.id)
    ).order_by(Transaccion.creado_en.desc()).all()

    return [
        {
            "id": str(t.id),
            "monto": float(t.monto),
            "tipo": t.tipo,
            "estado": t.estado,
            "fecha": str(t.creado_en)
        }
        for t in transacciones
    ]