from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import require_role, CurrentUser
from app.services.user_service import UserService
from app.models.user import UserUpdate, UserRolesUpdate

router = APIRouter(prefix="/users", tags=["Usuarios y Roles (Administrador)"])

@router.get("")
async def list_users(
    q: Optional[str] = Query(None, description="Buscar por nombre o correo"),
    estado: Optional[str] = Query(None, description="Filtro por estado"),
    rol: Optional[str] = Query(None, description="Filtro por rol"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = UserService(db)
    return await service.list_users(q, estado, rol, page, size)

@router.get("/roles/catalog")
async def list_roles(
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = UserService(db)
    return await service.list_roles()

@router.get("/{user_id}")
async def get_user(
    user_id: str,
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = UserService(db)
    return await service.get_user_by_id(user_id)

@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdate,
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = UserService(db)
    return await service.update_user(user_id, data, current_user.id)

@router.patch("/{user_id}/roles")
async def update_user_roles(
    user_id: str,
    data: UserRolesUpdate,
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = UserService(db)
    return await service.update_roles(user_id, data.roles, data.proveedor_id, current_user.id)

@router.post("/{user_id}/force-logout")
async def force_user_logout(
    user_id: str,
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = UserService(db)
    return await service.force_logout(user_id, current_user.id)
