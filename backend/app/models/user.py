from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

class RoleInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    nombre: str
    descripcion: str
    permisos: List[str]

    class Config:
        populate_by_name = True

class RoleResponse(BaseModel):
    id: str
    nombre: str
    descripcion: str
    permisos: List[str]

class UserBase(BaseModel):
    nombre: str
    email: EmailStr

class UserRegister(UserBase):
    password: str
    confirm_password: str
    captcha_token: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str
    dispositivo_id: str

class UserVerifyOtp(BaseModel):
    login_ticket: str
    otp_code: str
    forzar_cierre_previa: bool = False

class UserResendOtp(BaseModel):
    login_ticket: str

class UserForgotPassword(BaseModel):
    email: EmailStr
    captcha_token: str

class UserResetPassword(BaseModel):
    token: str
    nueva_password: str
    confirm_password: str

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    estado: Optional[str] = None
    proveedor_id: Optional[str] = None

class UserRolesUpdate(BaseModel):
    roles: List[str]
    proveedor_id: Optional[str] = None

class UserInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    nombre: str
    email: EmailStr
    password_hash: str
    roles: List[str] = Field(default_factory=lambda: ["Consulta"])
    proveedor_id: Optional[str] = None
    estado: str = "pendiente"  # pendiente, activo, bloqueado, inactivo
    intentos_fallidos: int = 0
    bloqueado_hasta: Optional[datetime] = None
    historial_passwords: List[str] = Field(default_factory=list)
    creado_en: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class UserResponse(BaseModel):
    id: str
    nombre: str
    email: str
    roles: List[str]
    proveedor_id: Optional[str] = None
    estado: str
    intentos_fallidos: int
    bloqueado_hasta: Optional[datetime] = None
    creado_en: datetime
