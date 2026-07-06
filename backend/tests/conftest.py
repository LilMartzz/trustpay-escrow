import os
import sys
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db  # noqa: E402
from models import Usuario, Billetera  # noqa: E402
from dependencies import get_usuario_actual  # noqa: E402
from routes.billetera_routes import router as billetera_router  # noqa: E402
from routes.escrow_routes import router as escrow_router  # noqa: E402
from routes.envio_routes import router as envio_router  # noqa: E402
from routes.chat_routes import router as chat_router  # noqa: E402
from routes.calificacion_routes import router as calificacion_router  # noqa: E402
from routes.evidencia_routes import router as evidencia_router  # noqa: E402


@pytest.fixture()
def motor():
    """SQLite en memoria compartido entre conexiones (StaticPool)."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def SessionTest(motor):
    return sessionmaker(autocommit=False, autoflush=False, bind=motor)


@pytest.fixture()
def db(SessionTest):
    sesion = SessionTest()
    yield sesion
    sesion.close()


class UsuarioActual:
    """Holder mutable: cada test decide qué usuario 'hace la request'."""

    def __init__(self):
        self.usuario = None


@pytest.fixture()
def usuario_actual():
    return UsuarioActual()


@pytest.fixture()
def app(SessionTest, usuario_actual):
    aplicacion = FastAPI()
    aplicacion.include_router(billetera_router)
    aplicacion.include_router(escrow_router)
    aplicacion.include_router(envio_router)
    aplicacion.include_router(chat_router)
    aplicacion.include_router(calificacion_router)
    aplicacion.include_router(evidencia_router)

    def _get_db():
        sesion = SessionTest()
        try:
            yield sesion
        finally:
            sesion.close()

    def _get_usuario(db_sesion=None):
        # Re-carga el usuario en una sesión fresca para no cruzar sesiones.
        sesion = SessionTest()
        try:
            return sesion.query(Usuario).filter(Usuario.id == usuario_actual.usuario.id).first()
        finally:
            sesion.close()

    aplicacion.dependency_overrides[get_db] = _get_db
    aplicacion.dependency_overrides[get_usuario_actual] = _get_usuario
    return aplicacion


@pytest.fixture()
def client(app):
    return TestClient(app)


@pytest.fixture()
def crear_usuario(db):
    """Factory: crea usuario + billetera con saldo inicial."""

    def _crear(nombre="Usuario Test", saldo=1000, email_verificado=True):
        sufijo = uuid.uuid4().hex[:8]
        usuario = Usuario(
            firebase_uid=f"uid-{sufijo}",
            nombre=nombre,
            email=f"{sufijo}@test.pe",
            email_verificado=email_verificado,
        )
        db.add(usuario)
        db.flush()
        billetera = Billetera(usuario_id=usuario.id, saldo=saldo, saldo_retenido=0)
        db.add(billetera)
        db.commit()
        db.refresh(usuario)
        return usuario

    return _crear
