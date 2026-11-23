"""Database connection and session factory using SQLAlchemy 2.0."""

import re
import urllib.parse
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.core.config import settings


def get_safe_engine(raw_url: str):
    clean_url = (raw_url or "").strip().strip('"').strip("'")
    if not clean_url:
        clean_url = "postgresql+psycopg://postgres:root@localhost:5432/tms_express_db"

    try:
        return create_engine(clean_url, pool_pre_ping=True, echo=False)
    except Exception:
        # Si le mot de passe contient des caractères spéciaux (ex: @, #, $, %) non encodés :
        m = re.match(r"^([^:]+://)([^:]+):(.*)@([^@:/]+)(?::(\d+))?/(.+)$", clean_url)
        if m:
            driver, user, password, host, port, dbname = m.groups()
            encoded_password = urllib.parse.quote_plus(password)
            safe_url = f"{driver}{user}:{encoded_password}@{host}:{port or '5432'}/{dbname}"
            return create_engine(safe_url, pool_pre_ping=True, echo=False)
        # Si le format est purement postgresql:// sans psycopg driver :
        if clean_url.startswith("postgresql://"):
            safe_url = clean_url.replace("postgresql://", "postgresql+psycopg://", 1)
            return create_engine(safe_url, pool_pre_ping=True, echo=False)
        raise


def ensure_database_exists(raw_url: str) -> bool:
    """Vérifie si la base de données cible existe dans PostgreSQL, et la crée automatiquement si besoin."""
    clean_url = (raw_url or "").strip().strip('"').strip("'")
    if not clean_url or not clean_url.startswith("postgres"):
        return False

    m = re.match(r"^(.*?)/([^/?]+)(\?.*)?$", clean_url)
    if not m:
        return False
    prefix, dbname, suffix = m.group(1), m.group(2), m.group(3) or ""
    if dbname in ("postgres", "template0", "template1"):
        return True

    maint_url = f"{prefix}/postgres{suffix}"
    try:
        maint_engine = get_safe_engine(maint_url)
        with maint_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            exists = conn.execute(
                text(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
            ).scalar()
            if not exists:
                print(f"   [PostgreSQL] Base '{dbname}' absente. Création automatique...")
                conn.execute(text(f'CREATE DATABASE "{dbname}" ENCODING \'UTF8\';'))
                print(f"   ✓ Base de données '{dbname}' créée avec succès.")
        maint_engine.dispose()
        return True
    except Exception:
        return False


# Assurer que la base existe physiquement si PostgreSQL est accessible
try:
    ensure_database_exists(settings.DATABASE_URL)
except Exception:
    pass

# Engine configured for PostgreSQL with connection pooling
engine = get_safe_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency provider yielding an active database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
