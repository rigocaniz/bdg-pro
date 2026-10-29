from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.exceptions import BadRequestException
from app.api.deps import require_permission, CurrentUser
from app.services.movement_service import MovementService

router = APIRouter(prefix="/movements", tags=["Consulta de Movimientos"])

@router.get("")
async def get_movements(
    tipo: str = Query("pedidos", description="Pestaña a consultar: pedidos | ingresos | cambios"),
    fecha_desde: Optional[str] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    fecha_hasta: Optional[str] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    proveedor_id: Optional[str] = Query(None, description="Filtro por proveedor"),
    producto_id: Optional[str] = Query(None, description="Filtro por producto"),
    numero_solicitud: Optional[str] = Query(None, description="Filtro por número de solicitud"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("Consultar movimientos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = MovementService(db)
    user_prov = current_user.proveedor_id if ("Proveedor" in current_user.roles and not current_user.has_role("Administrador")) else None

    if tipo == "pedidos":
        return await service.get_pedidos(
            fecha_desde, fecha_hasta, proveedor_id, producto_id, numero_solicitud, user_prov, page, size
        )
    elif tipo == "ingresos":
        return await service.get_productos_ingresados(
            fecha_desde, fecha_hasta, proveedor_id, producto_id, numero_solicitud, user_prov, page, size
        )
    elif tipo == "cambios":
        return await service.get_cambios_timeline(
            fecha_desde, fecha_hasta, proveedor_id, producto_id, numero_solicitud, user_prov, page, size
        )
    else:
        raise BadRequestException(
            f"Tipo de consulta de movimiento no válido: '{tipo}'. Debe ser 'pedidos', 'ingresos' o 'cambios'.",
            codigo="INVALID_MOVEMENT_TYPE"
        )
