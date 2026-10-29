from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import require_permission, CurrentUser
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Consulta de Inventario"])

@router.get("")
async def get_inventory(
    q: Optional[str] = Query(None, description="Buscar por código o nombre"),
    sort_by: str = Query("nombre", description="Campo a ordenar: codigo, nombre, cantidad"),
    sort_dir: int = Query(1, description="1 para ascendente, -1 para descendente"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("Consultar inventario y productos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = InventoryService(db)
    return await service.list_inventory(q, sort_by, sort_dir, page, size)

@router.get("/export")
async def export_inventory_csv(
    q: Optional[str] = Query(None, description="Filtro opcional para exportación"),
    current_user: CurrentUser = Depends(require_permission("Consultar inventario y productos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = InventoryService(db)
    csv_content = await service.export_inventory_csv(q)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventario_disponible.csv"}
    )
