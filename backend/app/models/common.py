from typing import Generic, TypeVar, List
from pydantic import BaseModel, Field

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

class ApiMessageResponse(BaseModel):
    codigo: str = "OK"
    mensaje: str
    detalles: dict = Field(default_factory=dict)
