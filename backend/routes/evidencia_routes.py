from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Evidencia, Escrow, Transaccion, Billetera
from auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid, os, shutil

router = APIRouter(prefix="/evidencia", tags=["evidencia"])
security = HTTPBearer()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    from models import Usuario
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    usuario = db.query(Usuario).filter(Usuario.id == payload["sub"]).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

def verificar_parte_involucrada(escrow_id: str, usuario, db: Session):
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow no encontrado")
    transaccion = db.query(Transaccion).filter(Transaccion.id == escrow.transaccion_id).first()
    billetera_usuario = db.query(Billetera).filter(Billetera.usuario_id == usuario.id).first()
    es_parte = (
        billetera_usuario.id == transaccion.billetera_origen or
        billetera_usuario.id == transaccion.billetera_destino
    )
    if not es_parte:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta operación")
    return escrow

@router.post("/subir-archivo/{escrow_id}")
def subir_archivo(
    escrow_id: str,
    descripcion: str = Form(...),
    archivo: UploadFile = File(...),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    verificar_parte_involucrada(escrow_id, usuario, db)

    ext = archivo.filename.split(".")[-1]
    nombre = f"{uuid.uuid4()}.{ext}"
    ruta = os.path.join(UPLOAD_DIR, nombre)

    with open(ruta, "wb") as f:
        shutil.copyfileobj(archivo.file, f)

    evidencia = Evidencia(
        escrow_id=escrow_id,
        usuario_id=usuario.id,
        tipo="archivo",
        url=f"/uploads/{nombre}",
        descripcion=descripcion
    )
    db.add(evidencia)
    db.commit()

    return {"mensaje": "Evidencia subida correctamente", "url": evidencia.url}

@router.post("/subir-link/{escrow_id}")
def subir_link(
    escrow_id: str,
    link: str,
    descripcion: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    verificar_parte_involucrada(escrow_id, usuario, db)

    evidencia = Evidencia(
        escrow_id=escrow_id,
        usuario_id=usuario.id,
        tipo="link",
        url=link,
        descripcion=descripcion
    )
    db.add(evidencia)
    db.commit()

    return {"mensaje": "Link registrado como evidencia", "url": link}

@router.get("/ver/{escrow_id}")
def ver_evidencias(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    verificar_parte_involucrada(escrow_id, usuario, db)

    evidencias = db.query(Evidencia).filter(Evidencia.escrow_id == escrow_id).all()
    return [
        {
            "id": str(e.id),
            "tipo": e.tipo,
            "url": e.url,
            "descripcion": e.descripcion,
            "subido_por": str(e.usuario_id),
            "fecha": str(e.subido_en)
        }
        for e in evidencias
    ]