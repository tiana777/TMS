"""Application configuration settings."""

import os
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "TMS EXPRESS"
    VERSION: str = "5.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres@localhost:5432/tms_express_db"
    )
    
    # Timezone & Locale
    TIMEZONE: str = "Indian/Antananarivo"  # GMT+3
    CURRENCY: str = "MGA"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-tms-express-key-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours


settings = Settings()
