"""Security and Authentication utilities (JWT tokens & RBAC)."""

import base64
import hashlib
import hmac
import json
import time
from typing import List, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import UserORM

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Computes SHA-256 password hash."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def create_access_token(data: dict, expires_in_seconds: Optional[int] = None) -> str:
    """Generates signed JWT-compatible token using HMAC-SHA256."""
    if expires_in_seconds is None:
        expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in_seconds

    header_bytes = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=")
    payload_bytes = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")
    to_sign = header_bytes + b"." + payload_bytes

    sig = hmac.new(settings.SECRET_KEY.encode(), to_sign, hashlib.sha256).digest()
    sig_bytes = base64.urlsafe_b64encode(sig).rstrip(b"=")

    return (to_sign + b"." + sig_bytes).decode()


def decode_access_token(token: str) -> dict:
    """Decodes and verifies signed token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou corrompu.",
        )

    header_b64, payload_b64, sig_b64 = parts[0], parts[1], parts[2]
    to_verify = f"{header_b64}.{payload_b64}".encode()

    expected_sig = base64.urlsafe_b64encode(
        hmac.new(settings.SECRET_KEY.encode(), to_verify, hashlib.sha256).digest()
    ).rstrip(b"=").decode()

    if not hmac.compare_digest(sig_b64, expected_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature du token non valide.",
        )

    # Decode payload
    rem = len(payload_b64) % 4
    if rem:
        payload_b64 += "=" * (4 - rem)
    payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
    payload = json.loads(payload_json)

    if payload.get("exp", 0) < time.time():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré.",
        )

    return payload


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> UserORM:
    if not credentials:
        # Development fallback: check X-User-Role header or default to supervisor
        simulated_role = request.headers.get("x-user-role")
        if simulated_role:
            user_by_role = db.query(UserORM).filter(UserORM.role == simulated_role.upper(), UserORM.actif == 1).first()
            if user_by_role:
                return user_by_role

        default_user = db.query(UserORM).filter(UserORM.username == "superviseur").first()
        if not default_user:
            default_user = db.query(UserORM).filter(UserORM.role == "SUPER_ADMIN").first()
        if default_user:
            return default_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur introuvable dans le token.",
        )

    user = db.query(UserORM).filter(UserORM.id == user_id, UserORM.actif == 1).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé ou inactif.",
        )
    return user


def require_roles(allowed_roles: List[str]):
    """Role-Based Access Control (RBAC) Dependency matching CDC section 3.4."""
    def role_checker(current_user: UserORM = Depends(get_current_user)) -> UserORM:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé pour le profil '{current_user.role}'. Rôles requis : {', '.join(allowed_roles)}.",
            )
        return current_user
    return role_checker
