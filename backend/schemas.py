from pydantic import BaseModel, EmailStr
from uuid import UUID

class RegistroRequest(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    telefono: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UsuarioResponse(BaseModel):
    id: UUID
    nombre: str
    email: str

    class Config:
        from_attributes = True