from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class InventoryItemInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    producto_id: str
    codigo: str
    nombre: str
    cantidad: int = 0
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class InventoryItemResponse(BaseModel):
    id: str
    producto_id: str
    codigo: str
    nombre: str
    cantidad: int
    actualizado_en: datetime
