"""Auth DTOs."""

from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequestDTO(BaseModel):
    username: str
    password: str


class TokenResponseDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    nom_complet: str
    id: Optional[int] = None
    assigned_flux: Optional[str] = None


class UserResponseDTO(BaseModel):
    id: int
    username: str
    email: str
    role: str
    nom_complet: str
    assigned_flux: Optional[str] = None
    actif: bool


class CreateUserDTO(BaseModel):
    username: str
    email: str
    role: str
    nom_complet: str
    password: str
    assigned_flux: Optional[str] = None


class UpdateUserDTO(BaseModel):
    nom_complet: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    assigned_flux: Optional[str] = None
    actif: Optional[bool] = None

