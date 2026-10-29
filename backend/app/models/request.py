from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field

class RequestLineCreate(BaseModel):
    producto_id: str
    cant_solicitada: int = Field(gt=0, description="La cantidad debe ser mayor a 0")

class RequestLineConfirm(BaseModel):
    producto_id: str
    cant_confirmada: int = Field(ge=0, description="La cantidad confirmada no puede ser negativa")
    fecha_estimada: Optional[date] = None
    comentario: Optional[str] = None

class RequestLineReceive(BaseModel):
    producto_id: str
    recibido: bool
    cant_recibida: int = Field(ge=0, description="Cantidad efectivamente recibida")
    motivo: Optional[str] = Field(default=None, description="Obligatorio si recibido < confirmado: faltante, dañado, producto incorrecto, otro")

class RequestLineInDB(BaseModel):
    producto_id: str
    codigo: str
    nombre: str
    cant_solicitada: int
    cant_confirmada: int = 0
    cant_recibida: int = 0
    recibido: bool = False
    motivo: Optional[str] = None
    fecha_estimada: Optional[str] = None
    comentario_proveedor: Optional[str] = None

class RequestCreate(BaseModel):
    proveedor_id: str
    fecha_entrega: date
    observaciones: Optional[str] = None
    lineas: List[RequestLineCreate]
    enviar_inmediatamente: bool = False

class RequestUpdate(BaseModel):
    proveedor_id: Optional[str] = None
    fecha_entrega: Optional[date] = None
    observaciones: Optional[str] = None
    lineas: Optional[List[RequestLineCreate]] = None

class RequestConfirmPayload(BaseModel):
    lineas: List[RequestLineConfirm]
    comentario_general: Optional[str] = None

class RequestRejectPayload(BaseModel):
    motivo: str = Field(min_length=3, description="Motivo del rechazo de la solicitud")

class RequestCancelPayload(BaseModel):
    motivo: str = Field(min_length=3, description="Motivo de la cancelación")

class RequestReceivePayload(BaseModel):
    lineas: List[RequestLineReceive]
    observaciones_recepcion: Optional[str] = None

class RequestCloseShortagePayload(BaseModel):
    motivo: str = Field(min_length=3, description="Motivo del cierre con faltante")

class RequestInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    numero: str
    proveedor_id: str
    fecha_entrega: str  # YYYY-MM-DD
    estado: str  # Borrador, Enviada, Por entregar, Entregada, Entregada parcial, Cerrada con faltante, Rechazada, Cancelada
    observaciones: Optional[str] = ""
    creado_por: str  # usuario_id
    lineas: List[RequestLineInDB]
    motivo_rechazo_cancelacion: Optional[str] = None
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class RequestResponse(BaseModel):
    id: str
    numero: str
    proveedor_id: str
    proveedor_nombre: Optional[str] = None
    fecha_entrega: str
    estado: str
    observaciones: Optional[str] = ""
    creado_por: str
    creado_por_nombre: Optional[str] = None
    lineas: List[RequestLineInDB]
    motivo_rechazo_cancelacion: Optional[str] = None
    es_confirmacion_parcial: Optional[bool] = False
    creado_en: datetime
    actualizado_en: datetime
