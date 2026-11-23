"""Auth REST Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.application.dtos.auth_dtos import (
    CreateUserDTO,
    LoginRequestDTO,
    TokenResponseDTO,
    UpdateUserDTO,
    UserResponseDTO,
)
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import UserORM
from backend.app.infrastructure.security.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])



@router.post("/login", response_model=TokenResponseDTO)
def login(dto: LoginRequestDTO, db: Session = Depends(get_db)):
    login_identifier = dto.username.strip()
    user = (
        db.query(UserORM)
        .filter(
            ((UserORM.username == login_identifier) | (UserORM.email == login_identifier)),
            UserORM.actif == 1,
        )
        .first()
    )
    if not user or not verify_password(dto.password, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects (nom d'utilisateur ou mot de passe invalide).",
        )

    if user.role == "LIVREUR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé : les livreurs ne peuvent pas se connecter à l'application web de gestion.",
        )

    token = create_access_token({"sub": user.id, "role": user.role, "username": user.username, "assigned_flux": user.assigned_flux})
    return TokenResponseDTO(
        access_token=token,
        role=user.role,
        username=user.username,
        nom_complet=user.nom_complet,
        id=user.id,
        assigned_flux=user.assigned_flux,
    )


@router.get("/me", response_model=UserResponseDTO)
def get_me(current_user: UserORM = Depends(get_current_user)):
    return UserResponseDTO(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        nom_complet=current_user.nom_complet,
        assigned_flux=current_user.assigned_flux,
        actif=bool(current_user.actif),
    )


@router.get("/users", response_model=List[UserResponseDTO])
def list_users(
    role: Optional[str] = None,
    include_inactive: bool = True,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    """List all registered platform users with optional role filtering."""
    query = db.query(UserORM)
    if role and role.upper() != "ALL":
        query = query.filter(UserORM.role == role.upper())
    if not include_inactive:
        query = query.filter(UserORM.actif == 1)
    users = query.order_by(UserORM.id.asc()).all()
    return [
        UserResponseDTO(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            nom_complet=u.nom_complet,
            assigned_flux=u.assigned_flux,
            actif=bool(u.actif),
        )
        for u in users
    ]


@router.post("/users", response_model=UserResponseDTO, status_code=status.HTTP_201_CREATED)
def create_user(
    dto: CreateUserDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    """Create a new user account with hashed password and role assignment."""
    cleaned_username = dto.username.strip().lower()
    cleaned_email = dto.email.strip().lower()
    cleaned_role = dto.role.strip().upper()
    cleaned_nom = dto.nom_complet.strip()

    valid_roles = ["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN", "LIVREUR"]
    if cleaned_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rôle invalide '{cleaned_role}'. Rôles autorisés : {', '.join(valid_roles)}.",
        )

    if not cleaned_username or len(cleaned_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'identifiant doit comporter au moins 3 caractères.",
        )

    if not cleaned_nom:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nom complet de l'utilisateur est obligatoire.",
        )

    if not dto.password or len(dto.password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit comporter au moins 4 caractères.",
        )

    # Check username uniqueness
    existing_username = (
        db.query(UserORM)
        .filter(func.lower(UserORM.username) == cleaned_username)
        .first()
    )
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"L'identifiant '{cleaned_username}' est déjà utilisé par un autre compte.",
        )

    # Check email uniqueness
    existing_email = (
        db.query(UserORM)
        .filter(func.lower(UserORM.email) == cleaned_email)
        .first()
    )
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"L'adresse email '{cleaned_email}' est déjà utilisée.",
        )

    new_user = UserORM(
        username=cleaned_username,
        email=cleaned_email,
        role=cleaned_role,
        nom_complet=cleaned_nom,
        mot_de_passe_hash=hash_password(dto.password),
        assigned_flux=dto.assigned_flux.strip() if dto.assigned_flux else None,
        actif=1,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponseDTO(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        nom_complet=new_user.nom_complet,
        assigned_flux=new_user.assigned_flux,
        actif=bool(new_user.actif),
    )


@router.patch("/users/{user_id}/toggle-status", response_model=UserResponseDTO)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    """Toggle active/inactive status of a user account."""
    target_user = db.query(UserORM).filter(UserORM.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur introuvable (ID: {user_id}).",
        )

    if current_user.id == target_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action impossible : vous ne pouvez pas désactiver votre propre compte actuellement connecté.",
        )

    target_user.actif = 0 if target_user.actif == 1 else 1
    db.commit()
    db.refresh(target_user)

    return UserResponseDTO(
        id=target_user.id,
        username=target_user.username,
        email=target_user.email,
        role=target_user.role,
        nom_complet=target_user.nom_complet,
        assigned_flux=target_user.assigned_flux,
        actif=bool(target_user.actif),
    )


@router.patch("/users/{user_id}", response_model=UserResponseDTO)
def update_user(
    user_id: int,
    dto: UpdateUserDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    """Update user profile information."""
    target_user = db.query(UserORM).filter(UserORM.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur introuvable (ID: {user_id}).",
        )

    if dto.nom_complet is not None and dto.nom_complet.strip():
        target_user.nom_complet = dto.nom_complet.strip()

    if dto.email is not None and dto.email.strip():
        new_email = dto.email.strip().lower()
        if new_email != target_user.email.lower():
            dup = db.query(UserORM).filter(func.lower(UserORM.email) == new_email, UserORM.id != user_id).first()
            if dup:
                raise HTTPException(status_code=400, detail=f"L'adresse email '{new_email}' est déjà utilisée.")
            target_user.email = new_email

    if dto.role is not None and dto.role.strip():
        valid_roles = ["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN", "LIVREUR"]
        new_role = dto.role.strip().upper()
        if new_role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Rôle invalide '{new_role}'.")
        target_user.role = new_role

    if dto.assigned_flux is not None:
        target_user.assigned_flux = dto.assigned_flux.strip() if dto.assigned_flux else None

    if dto.password is not None and len(dto.password) >= 4:
        target_user.mot_de_passe_hash = hash_password(dto.password)

    if dto.actif is not None:
        if current_user.id == target_user.id and not dto.actif:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas désactiver votre propre compte.")
        target_user.actif = 1 if dto.actif else 0

    db.commit()
    db.refresh(target_user)

    return UserResponseDTO(
        id=target_user.id,
        username=target_user.username,
        email=target_user.email,
        role=target_user.role,
        nom_complet=target_user.nom_complet,
        assigned_flux=target_user.assigned_flux,
        actif=bool(target_user.actif),
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    """Deactivate / archive a user account."""
    target_user = db.query(UserORM).filter(UserORM.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur introuvable (ID: {user_id}).",
        )
    if current_user.id == target_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action impossible : vous ne pouvez pas supprimer votre propre compte.",
        )
    target_user.actif = 0
    db.commit()
    return {"success": True, "message": f"Compte {target_user.nom_complet} désactivé avec succès."}

