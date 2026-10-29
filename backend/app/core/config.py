import os
from typing import List

try:
    from pydantic_settings import BaseSettings
except ImportError:
    class BaseSettings:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema de Solicitudes a Proveedores e Inventario"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Base de datos MongoDB
    # Soporta replica set rs0 configurado en docker-compose
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "bdg_inventario")

    # Seguridad JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-solicitudes-inventario-2026-xyz789")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OTP y Tokens
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    VERIFY_EMAIL_EXPIRE_HOURS: int = 24

    # Bloqueos y Sesión única
    MAX_FAILED_PASSWORD_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15
    INACTIVITY_TIMEOUT_MINUTES: int = 30

    # reCAPTCHA
    RECAPTCHA_SECRET_KEY: str = os.getenv(
        "RECAPTCHA_SECRET_KEY", 
        "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
    )
    RECAPTCHA_SITE_KEY: str = os.getenv(
        "RECAPTCHA_SITE_KEY", 
        "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
    )
    BYPASS_CAPTCHA_DEV: bool = os.getenv("BYPASS_CAPTCHA_DEV", "true").lower() == "true"

    # Correo / Notificaciones
    SIMULATE_EMAIL: bool = True
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "sistema@solicitudes.com")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:80",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
