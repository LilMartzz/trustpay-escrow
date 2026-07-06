from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from models import Evidencia
from dependencies import get_usuario_actual, contexto_escrow, parse_uuid
from almacenamiento import guardar_documento_privado, leer_documento_privado
from utils import iso_utc

router = APIRouter(prefix="/evidencia", tags=["evidencia"])

# Solo formatos que un navegador muestra de forma segura: nada de HTML/SVG
# ejecutable servido desde nuestro dominio.
EXTENSIONES_PERMITIDAS = {"jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm", "pdf"}
TAMANO_MAXIMO = 15 * 1024 * 1024  # 15 MB


class LinkCreate(BaseModel):
    link: str = Field(max_length=2000)
    descripcion: str = Field(max_length=500)

    @field_validator("link")
    @classmethod
    def link_valido(cls, v):
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("El link debe empezar con http:// o https://")
        return v


def _url_publica(evidencia: Evidencia) -> str:
    """Los archivos ya no se sirven desde /uploads público: se descargan
    autenticados por id. Los links externos se devuelven tal cual."""
    if evidencia.tipo == "archivo":
        return f"/evidencia/archivo/{evidencia.id}"
    return evidencia.url


@router.post("/subir-archivo/{escrow_id}")
def subir_archivo(
    escrow_id: str,
    descripcion: str = Form(...),
    archivo: UploadFile = File(...),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, *_ = contexto_escrow(escrow_id, usuario, db)

    ext = (archivo.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido. Usa: {', '.join(sorted(EXTENSIONES_PERMITIDAS))}",
        )

    contenido = archivo.file.read(TAMANO_MAXIMO + 1)
    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(status_code=413, detail="El archivo supera el máximo de 15 MB")
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    referencia = guardar_documento_privado(contenido, "evidencia", ext, carpeta="evidencias")

    evidencia = Evidencia(
        escrow_id=escrow.id,
        usuario_id=usuario.id,
        tipo="archivo",
        url=referencia,
        descripcion=descripcion,
    )
    db.add(evidencia)
    db.commit()

    return {"mensaje": "Evidencia subida correctamente", "url": _url_publica(evidencia)}


@router.post("/subir-link/{escrow_id}")
def subir_link(
    escrow_id: str,
    data: LinkCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, *_ = contexto_escrow(escrow_id, usuario, db)

    evidencia = Evidencia(
        escrow_id=escrow.id,
        usuario_id=usuario.id,
        tipo="link",
        url=data.link,
        descripcion=data.descripcion,
    )
    db.add(evidencia)
    db.commit()

    return {"mensaje": "Link registrado como evidencia", "url": data.link}


@router.get("/ver/{escrow_id}")
def ver_evidencias(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, *_ = contexto_escrow(escrow_id, usuario, db)

    evidencias = db.query(Evidencia).filter(Evidencia.escrow_id == escrow.id).all()
    return [
        {
            "id": str(e.id),
            "tipo": e.tipo,
            "url": _url_publica(e),
            "descripcion": e.descripcion,
            "subido_por": str(e.usuario_id),
            "fecha": iso_utc(e.subido_en),
        }
        for e in evidencias
    ]


@router.get("/archivo/{evidencia_id}")
def descargar_archivo(
    evidencia_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    """Sirve el archivo de evidencia solo a las partes de la operación
    (reemplaza al mount público /uploads)."""
    eid = parse_uuid(evidencia_id, "Evidencia no encontrada")
    evidencia = db.query(Evidencia).filter(Evidencia.id == eid).first()
    if not evidencia or evidencia.tipo != "archivo":
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")

    # Reusa el chequeo de participante del escrow al que pertenece.
    contexto_escrow(str(evidencia.escrow_id), usuario, db)

    resultado = leer_documento_privado(evidencia.url)
    if resultado is None:
        raise HTTPException(status_code=404, detail="El archivo ya no está disponible")
    contenido, content_type = resultado
    return Response(content=contenido, media_type=content_type)
