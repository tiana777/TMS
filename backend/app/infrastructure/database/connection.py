"""Database connection and session factory using SQLAlchemy 2.0."""

import re
import urllib.parse
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.core.config import settings


def get_safe_engine(raw_url: str):
    clean_url = (raw_url or "").strip().strip('"').strip("'")
    if not clean_url:
        clean_url = "postgresql+psycopg://postgres:postgres@localhost:5432/tms_express_db"

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
