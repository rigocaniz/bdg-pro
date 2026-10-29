from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class SupplierBase(BaseModel):
    codigo: str
    nombre: str
    nit: str
    email: EmailStr
    telefono: str
    activo: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    nombre: Optional[str] = None
    nit: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None

class SupplierInDB(SupplierBase):
    id: Optional[str] = Field(default=None, alias="_id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class SupplierResponse(SupplierBase):
    id: str
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None
