from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
import models
from routes.auth_routes import router as auth_router
from routes.billetera_routes import router as billetera_router
from routes.escrow_routes import router as escrow_router
from routes.evidencia_routes import router as evidencia_router
from routes.perfil_routes import router as perfil_router
from routes.envio_routes import router as envio_router
from routes.chat_routes import router as chat_router
from tasks import iniciar_scheduler

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    iniciar_scheduler(SessionLocal)
    yield


app = FastAPI(title="TrustPay API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(billetera_router)
app.include_router(escrow_router)
app.include_router(evidencia_router)
app.include_router(perfil_router)
app.include_router(envio_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {"app": "TrustPay", "version": "1.0.0", "status": "ok"}
