from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ProductBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = ""
    unidad: str = "unidad"
    activo: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    unidad: Optional[str] = None
    activo: Optional[bool] = None

class ProductInDB(ProductBase):
    id: Optional[str] = Field(default=None, alias="_id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class ProductResponse(ProductBase):
    id: str
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None
