from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routes.auth_routes import router as auth_router
from routes.billetera_routes import router as billetera_router
from routes.escrow_routes import router as escrow_router
from routes.evidencia_routes import router as evidencia_router
from routes.perfil_routes import router as perfil_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/")
def root():
    return {"mensaje": "API del proyecto Escrow funcionando"}