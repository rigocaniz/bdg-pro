from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class TokenType:
    OTP_LOGIN = "otp_login"
    VERIFICAR_EMAIL = "verificar_email"
    RESET_PASSWORD = "reset_password"

class VerificationTokenInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    usuario_id: str
    tipo: str  # otp_login, verificar_email, reset_password
    codigo_hash: str
    intentos: int = 0
    expira_en: datetime
    usado: bool = False
    creado_en: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
