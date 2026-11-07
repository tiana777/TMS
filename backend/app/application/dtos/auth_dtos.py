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


class UserResponseDTO(BaseModel):
    id: int
    username: str
    email: str
    role: str
    nom_complet: str
    actif: bool
