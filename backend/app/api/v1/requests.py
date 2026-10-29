from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database, db_instance
from app.api.deps import (
    require_permission,
    get_current_user,
    CurrentUser
)
from app.core.exceptions import ForbiddenException
from app.services.request_service import RequestService
from app.services.inventory_service import InventoryService
from app.models.request import (
    RequestCreate,
    RequestUpdate,
    RequestConfirmPayload,
    RequestRejectPayload,
    RequestCancelPayload,
    RequestReceivePayload,
    RequestCloseShortagePayload
)

router = APIRouter(prefix="/requests", tags=["Gestión de Solicitudes a Proveedores"])

@router.get("")
async def list_requests(
    q: Optional[str] = Query(None, description="Buscar por correlativo u observaciones"),
    estado: Optional[str] = Query(None, description="Filtro por estado"),
    proveedor_id: Optional[str] = Query(None, description="Filtro por proveedor"),
    fecha_desde: Optional[str] = Query(None, description="Fecha de entrega desde (YYYY-MM-DD)"),
    fecha_hasta: Optional[str] = Query(None, description="Fecha de entrega hasta (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    # Regla: El rol Proveedor está vinculado a un proveedor y solo ve las solicitudes dirigidas a él
    prov_filtro = current_user.proveedor_id if ("Proveedor" in current_user.roles and not current_user.has_role("Administrador")) else proveedor_id
    return await service.list_requests(q, estado, prov_filtro, fecha_desde, fecha_hasta, page, size)

@router.post("")
async def create_request(
    data: RequestCreate,
    current_user: CurrentUser = Depends(require_permission("Crear / editar / cancelar solicitudes")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    return await service.create_request(data, current_user.id)

@router.get("/{solicitud_id}")
async def get_request(
    solicitud_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    res = await service.get_request_by_id(solicitud_id)
    # Restricción de proveedor
    if "Proveedor" in current_user.roles and not current_user.has_role("Administrador"):
        if res["proveedor_id"] != current_user.proveedor_id:
            raise ForbiddenException("No tiene permiso para ver solicitudes dirigidas a otro proveedor.")
    return res

@router.patch("/{solicitud_id}")
async def update_request_draft(
    solicitud_id: str,
    data: RequestUpdate,
    current_user: CurrentUser = Depends(require_permission("Crear / editar / cancelar solicitudes")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    return await service.update_request_draft(solicitud_id, data, current_user.id)

@router.post("/{solicitud_id}/send")
async def send_to_supplier(
    solicitud_id: str,
    current_user: CurrentUser = Depends(require_permission("Enviar solicitud al proveedor")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    return await service.send_to_supplier(solicitud_id, current_user.id)

@router.post("/{solicitud_id}/cancel")
async def cancel_request(
    solicitud_id: str,
    payload: RequestCancelPayload,
    current_user: CurrentUser = Depends(require_permission("Crear / editar / cancelar solicitudes")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    return await service.cancel_request(solicitud_id, payload.motivo, current_user.id)

@router.post("/{solicitud_id}/confirm")
async def confirm_request(
    solicitud_id: str,
    payload: RequestConfirmPayload,
    current_user: CurrentUser = Depends(require_permission("Confirmar cantidades a entregar")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    user_prov = current_user.proveedor_id if not current_user.has_role("Administrador") else None
    return await service.confirm_by_supplier(solicitud_id, payload, current_user.id, user_prov)

@router.post("/{solicitud_id}/reject")
async def reject_request(
    solicitud_id: str,
    payload: RequestRejectPayload,
    current_user: CurrentUser = Depends(require_permission("Confirmar cantidades a entregar")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    user_prov = current_user.proveedor_id if not current_user.has_role("Administrador") else None
    return await service.reject_by_supplier(solicitud_id, payload.motivo, current_user.id, user_prov)

@router.post("/{solicitud_id}/receive")
async def receive_delivery(
    solicitud_id: str,
    payload: RequestReceivePayload,
    current_user: CurrentUser = Depends(require_permission("Registrar recepción de entrega")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = InventoryService(db, client=db_instance.client)
    return await service.receive_delivery(solicitud_id, payload, current_user.id)

@router.post("/{solicitud_id}/close-shortage")
async def close_with_shortage(
    solicitud_id: str,
    payload: RequestCloseShortagePayload,
    current_user: CurrentUser = Depends(require_permission("Crear / editar / cancelar solicitudes")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = RequestService(db)
    return await service.close_with_shortage(solicitud_id, payload.motivo, current_user.id)
