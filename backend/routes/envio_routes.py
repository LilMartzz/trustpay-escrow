from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator

from database import get_db
from models import Billetera, Envio
from dependencies import get_usuario_actual, contexto_escrow
from notificaciones import enviar_notificacion
from utils import iso_utc

router = APIRouter(prefix="/envio", tags=["envio"])

EMPRESAS = [
    "Serpost", "Olva Courier", "Shalom", "Cruz del Sur",
    "DHL", "FedEx", "GLS", "Motorizado propio", "Otro",
]


class EnvioCreate(BaseModel):
    empresa: str
    numero_guia: str = Field(max_length=100)
    descripcion_producto: str = Field(default="", max_length=500)

    @field_validator("empresa")
    @classmethod
    def empresa_valida(cls, v):
        if v not in EMPRESAS:
            raise ValueError(f"Empresa inválida. Opciones: {EMPRESAS}")
        return v

    @field_validator("numero_guia")
    @classmethod
    def guia_no_vacia(cls, v):
        if not v.strip():
            raise ValueError("El número de guía no puede estar vacío")
        return v.strip()


@router.post("/{escrow_id}")
def registrar_envio(
    escrow_id: str,
    data: EnvioCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, transaccion, _, _, es_vendedor = contexto_escrow(escrow_id, usuario, db)

    if not es_vendedor:
        raise HTTPException(status_code=403, detail="Solo el vendedor puede registrar el envío")
    if escrow.estado != "retenido":
        raise HTTPException(status_code=400, detail="El escrow no está activo")

    envio = db.query(Envio).filter(Envio.escrow_id == escrow.id).first()
    if envio:
        envio.empresa = data.empresa
        envio.numero_guia = data.numero_guia
        envio.descripcion_producto = data.descripcion_producto
        envio.estado = "en_camino"
    else:
        envio = Envio(
            escrow_id=escrow.id,
            empresa=data.empresa,
            numero_guia=data.numero_guia,
            descripcion_producto=data.descripcion_producto,
            estado="en_camino",
        )
        db.add(envio)

    db.commit()

    billetera_comprador = db.query(Billetera).filter(Billetera.id == transaccion.billetera_origen).first()
    if billetera_comprador:
        enviar_notificacion(
            db, billetera_comprador.usuario_id,
            "Tu pedido fue enviado",
            f"{usuario.nombre} despachó tu pedido con {envio.empresa} — guía {envio.numero_guia}",
        )

    return {
        "mensaje": "Envío registrado correctamente",
        "empresa": envio.empresa,
        "numero_guia": envio.numero_guia,
        "estado": envio.estado,
    }


@router.get("/{escrow_id}")
def ver_envio(
    escrow_id: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    escrow, *_ = contexto_escrow(escrow_id, usuario, db)

    envio = db.query(Envio).filter(Envio.escrow_id == escrow.id).first()
    if not envio:
        return None

    return {
        "empresa": envio.empresa,
        "numero_guia": envio.numero_guia,
        "estado": envio.estado,
        "descripcion_producto": envio.descripcion_producto,
        "creado_en": iso_utc(envio.creado_en),
    }


@router.put("/{escrow_id}/estado")
def actualizar_estado_envio(
    escrow_id: str,
    estado: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    estados_validos = ["preparando", "en_camino", "entregado"]
    if estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Opciones: {estados_validos}",
        )

    escrow, _, _, _, es_vendedor = contexto_escrow(escrow_id, usuario, db)
    if not es_vendedor:
        raise HTTPException(status_code=403, detail="Solo el vendedor puede actualizar el estado")

    envio = db.query(Envio).filter(Envio.escrow_id == escrow.id).first()
    if not envio:
        raise HTTPException(status_code=404, detail="Primero registra el envío")

    envio.estado = estado
    db.commit()
    return {"mensaje": "Estado de envío actualizado", "estado": estado}


@router.get("/empresas/lista")
def listar_empresas():
    return {"empresas": EMPRESAS}
