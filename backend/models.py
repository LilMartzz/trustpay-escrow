import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    email_verificado = Column(Boolean, default=False)
    telefono = Column(String)
    creado_en = Column(DateTime, server_default=func.now())
    # no_verificado | pendiente | verificado
    verificado = Column(String, default="no_verificado")
    dni_url = Column(String, nullable=True)
    selfie_url = Column(String, nullable=True)
    dni_numero = Column(String(8), nullable=True)


class Billetera(Base):
    __tablename__ = "billetera"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    saldo = Column(Numeric(12, 2), default=0)
    saldo_retenido = Column(Numeric(12, 2), default=0)
    estado = Column(String, default="activa")
    actualizado_en = Column(DateTime, server_default=func.now())


class Transaccion(Base):
    __tablename__ = "transacciones"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    billetera_origen = Column(UUID(as_uuid=True), ForeignKey("billetera.id"))
    billetera_destino = Column(UUID(as_uuid=True), ForeignKey("billetera.id"))
    monto = Column(Numeric(12, 2), nullable=False)
    tipo = Column(String, default="p2p")
    estado = Column(String, default="pendiente")
    descripcion = Column(String, nullable=True)
    creado_en = Column(DateTime, server_default=func.now())


class Escrow(Base):
    __tablename__ = "escrow"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaccion_id = Column(UUID(as_uuid=True), ForeignKey("transacciones.id"))
    monto_retenido = Column(Numeric(12, 2), nullable=False)
    estado = Column(String, default="retenido")
    expira_en = Column(DateTime)
    liberado_en = Column(DateTime)


class Evidencia(Base):
    __tablename__ = "evidencias"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    escrow_id = Column(UUID(as_uuid=True), ForeignKey("escrow.id"))
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    tipo = Column(String)  # "archivo" | "link"
    url = Column(String, nullable=False)
    descripcion = Column(String)
    subido_en = Column(DateTime, server_default=func.now())


class Envio(Base):
    __tablename__ = "envios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    escrow_id = Column(UUID(as_uuid=True), ForeignKey("escrow.id"), unique=True)
    empresa = Column(String, nullable=False)
    numero_guia = Column(String, nullable=False)
    descripcion_producto = Column(String, nullable=True)
    # preparando | en_camino | entregado | confirmado
    estado = Column(String, default="preparando")
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Mensaje(Base):
    __tablename__ = "mensajes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    escrow_id = Column(UUID(as_uuid=True), ForeignKey("escrow.id"))
    remitente_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    contenido = Column(String, nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow)
