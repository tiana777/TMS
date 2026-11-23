"""Application configuration settings."""

import os
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "TMS EXPRESS")
    VERSION: str = os.getenv("APP_VERSION", "5.0.0")
    API_V1_STR: str = "/api/v1"

    # Entreprise / Identité légale par défaut (surchargeable via DB ou .env)
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "TMS EXPRESS MADAGASCAR")
    COMPANY_NIF: str = os.getenv("COMPANY_NIF", "4001234567")
    COMPANY_STAT: str = os.getenv("COMPANY_STAT", "52291 11 2021 0 10245")
    COMPANY_RCS: str = os.getenv("COMPANY_RCS", "RCS Antananarivo 2021 B 00123")
    COMPANY_CIF: str = os.getenv("COMPANY_CIF", "0123456/DGI-J")
    COMPANY_ADDRESS: str = os.getenv("COMPANY_ADDRESS", "Tsiazotafo / Analakely, Antananarivo 101")
    COMPANY_PHONE: str = os.getenv("COMPANY_PHONE", "+261 34 00 000 00")
    COMPANY_EMAIL: str = os.getenv("COMPANY_EMAIL", "contact@tmsexpress.mg")
    COMPANY_WEBSITE: str = os.getenv("COMPANY_WEBSITE", "www.tmsexpress.mg")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres@localhost:5432/tms_express_db"
    )
    
    # Timezone & Locale
    TIMEZONE: str = os.getenv("TIMEZONE", "Indian/Antananarivo")  # GMT+3
    CURRENCY: str = os.getenv("CURRENCY", "MGA")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-tms-express-key-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # AI Vision & OCR (Gemini)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


settings = Settings()
