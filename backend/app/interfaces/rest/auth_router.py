"""Auth REST Router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.auth_dtos import (
    LoginRequestDTO,
    TokenResponseDTO,
    UserResponseDTO,
)
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import UserORM
from backend.app.infrastructure.security.auth import (
    create_access_token,
    get_current_user,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=TokenResponseDTO)
def login(dto: LoginRequestDTO, db: Session = Depends(get_db)):
    user = db.query(UserORM).filter(UserORM.username == dto.username, UserORM.actif == 1).first()
    if not user or not verify_password(dto.password, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects (nom d'utilisateur ou mot de passe invalide).",
        )

    token = create_access_token({"sub": user.id, "role": user.role, "username": user.username})
    return TokenResponseDTO(
        access_token=token,
        role=user.role,
        username=user.username,
        nom_complet=user.nom_complet,
    )


@router.get("/me", response_model=UserResponseDTO)
def get_me(current_user: UserORM = Depends(get_current_user)):
    return UserResponseDTO(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        nom_complet=current_user.nom_complet,
        actif=bool(current_user.actif),
    )
