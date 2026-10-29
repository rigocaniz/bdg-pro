from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SecurityAuditInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    evento: str  # LOGIN_SUCCESS, LOGIN_FAILED, OTP_SENT, OTP_FAILED, PASSWORD_RESET, ROLES_CHANGED, FORCED_LOGOUT, REGISTER
    usuario_id: Optional[str] = None
    email: str
    ip: str
    dispositivo_id: Optional[str] = None
    exito: bool
    detalle: Optional[str] = ""
    fecha: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class SecurityAuditResponse(BaseModel):
    id: str
    evento: str
    usuario_id: Optional[str] = None
    email: str
    ip: str
    dispositivo_id: Optional[str] = None
    exito: bool
    detalle: Optional[str] = ""
    fecha: datetime
