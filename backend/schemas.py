from pydantic import BaseModel
from uuid import UUID

class SyncUsuarioRequest(BaseModel):
    nombre: str
    telefono: str | None = None

class FcmTokenRequest(BaseModel):
    token: str

class UsuarioResponse(BaseModel):
    id: UUID
    nombre: str
    email: str

    class Config:
        from_attributes = True
