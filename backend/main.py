import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from firebase_config import init_firebase
import models
from routes.auth_routes import router as auth_router
from routes.billetera_routes import router as billetera_router
from routes.escrow_routes import router as escrow_router
from routes.evidencia_routes import router as evidencia_router
from routes.perfil_routes import router as perfil_router
from routes.envio_routes import router as envio_router
from routes.chat_routes import router as chat_router
from routes.calificacion_routes import router as calificacion_router
from routes.admin_routes import router as admin_router
from tasks import iniciar_scheduler

init_firebase()
Base.metadata.create_all(bind=engine)

# Mini-migraciones: create_all no agrega columnas ni índices a tablas existentes.
from sqlalchemy import text

_MIGRACIONES = [
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni_nombre_reniec VARCHAR",
    # Idempotencia de depósitos: una orden de Mercado Pago no puede acreditarse dos veces.
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_transacciones_ref_externa "
    "ON transacciones (referencia_externa) WHERE referencia_externa IS NOT NULL",
    # Un DNI identifica a una sola cuenta.
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_dni_numero "
    "ON usuarios (dni_numero) WHERE dni_numero IS NOT NULL",
]
for _sql in _MIGRACIONES:
    try:
        with engine.begin() as conn:
            conn.execute(text(_sql))
    except Exception as e:  # p. ej. datos duplicados preexistentes
        print(f"[Migración] Falló '{_sql[:60]}…': {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    iniciar_scheduler(SessionLocal)
    yield


app = FastAPI(title="TrustPay API", version="1.0.0", lifespan=lifespan)

# Orígenes permitidos vía env (coma-separados). Sin configurar cae a "*" para
# no romper el despliegue actual, pero en producción debe fijarse al dominio
# de Vercel: CORS_ORIGINS=https://tuapp.vercel.app
_origenes = os.getenv("CORS_ORIGINS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origenes.split(",")] if _origenes else ["*"],
    allow_credentials=bool(_origenes),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nota: el mount público /uploads se eliminó. Las evidencias se sirven
# autenticadas vía GET /evidencia/archivo/{id} y los documentos de identidad
# vía GET /perfil/documento/{tipo}.

app.include_router(auth_router)
app.include_router(billetera_router)
app.include_router(escrow_router)
app.include_router(evidencia_router)
app.include_router(perfil_router)
app.include_router(envio_router)
app.include_router(chat_router)
app.include_router(calificacion_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"app": "TrustPay", "version": "1.0.0", "status": "ok"}
