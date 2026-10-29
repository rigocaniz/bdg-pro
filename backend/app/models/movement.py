from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class MovementType:
    PEDIDO_CREADO = "PEDIDO_CREADO"
    ESTADO_CAMBIADO = "ESTADO_CAMBIADO"
    CONFIRMACION = "CONFIRMACION"
    INGRESO_INVENTARIO = "INGRESO_INVENTARIO"

class MovementInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    tipo: str  # PEDIDO_CREADO, ESTADO_CAMBIADO, CONFIRMACION, INGRESO_INVENTARIO
    solicitud_id: str
    numero_solicitud: Optional[str] = None
    proveedor_id: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    producto_id: Optional[str] = None
    codigo_producto: Optional[str] = None
    nombre_producto: Optional[str] = None
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    cantidad: Optional[int] = None
    usuario_id: str
    usuario_nombre: Optional[str] = None
    comentario: Optional[str] = ""
    fecha: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class MovementResponse(BaseModel):
    id: str
    tipo: str
    solicitud_id: str
    numero_solicitud: Optional[str] = None
    proveedor_id: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    producto_id: Optional[str] = None
    codigo_producto: Optional[str] = None
    nombre_producto: Optional[str] = None
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    cantidad: Optional[int] = None
    usuario_id: str
    usuario_nombre: Optional[str] = None
    comentario: Optional[str] = ""
    fecha: datetime
