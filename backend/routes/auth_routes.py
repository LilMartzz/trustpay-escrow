from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario, Billetera
from schemas import RegistroRequest, LoginRequest, TokenResponse
from auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/registro", response_model=TokenResponse)
def registro(data: RegistroRequest, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    usuario = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        telefono=data.telefono
    )
    db.add(usuario)
    db.flush()

    billetera = Billetera(usuario_id=usuario.id)
    db.add(billetera)
    db.commit()

    token = create_token({"sub": str(usuario.id), "email": usuario.email})
    return {"access_token": token}

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == data.email).first()
    if not usuario or not verify_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    token = create_token({"sub": str(usuario.id), "email": usuario.email})
    return {"access_token": token}