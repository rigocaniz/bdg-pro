from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SessionInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    usuario_id: str
    dispositivo_id: str
    ip: str
    user_agent: str
    refresh_token_hash: Optional[str] = None
    activa: bool = True
    creada_en: datetime = Field(default_factory=datetime.utcnow)
    ultimo_acceso: datetime = Field(default_factory=datetime.utcnow)
    expira_en: datetime

    class Config:
        populate_by_name = True

class SessionResponse(BaseModel):
    id: str
    usuario_id: str
    dispositivo_id: str
    ip: str
    user_agent: str
    activa: bool
    creada_en: datetime
    ultimo_acceso: datetime
