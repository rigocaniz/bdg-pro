from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.exceptions import NotFoundException, ConflictException
from app.api.deps import require_role, CurrentUser
from app.models.supplier import SupplierCreate, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["Catálogo de Proveedores"])

@router.get("")
async def list_suppliers(
    q: Optional[str] = Query(None, description="Búsqueda por código, nombre o NIT"),
    activo: Optional[bool] = Query(None, description="Filtro por activo"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_role("Compras")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filtro = {}
    if q:
        filtro["$or"] = [
            {"codigo": {"$regex": q, "$options": "i"}},
            {"nombre": {"$regex": q, "$options": "i"}},
            {"nit": {"$regex": q, "$options": "i"}}
        ]
    if activo is not None:
        filtro["activo"] = activo

    total = await db.proveedores.count_documents(filtro)
    skip = (page - 1) * size
    cursor = db.proveedores.find(filtro).sort("nombre", 1).skip(skip).limit(size)

    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "codigo": doc["codigo"],
            "nombre": doc["nombre"],
            "nit": doc["nit"],
            "email": doc["email"],
            "telefono": doc["telefono"],
            "activo": doc.get("activo", True),
            "creado_en": doc.get("creado_en"),
            "actualizado_en": doc.get("actualizado_en")
        })

    pages = (total + size - 1) // size if size > 0 else 1
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

@router.post("")
async def create_supplier(
    data: SupplierCreate,
    current_user: CurrentUser = Depends(require_role("Compras")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    codigo = data.codigo.strip().upper()
    existing = await db.proveedores.find_one({"codigo": codigo})
    if existing:
        raise ConflictException(f"Ya existe un proveedor con el código '{codigo}'.", codigo="DUPLICATE_SUPPLIER_CODE")

    now = datetime.now(timezone.utc)
    doc = {
        "codigo": codigo,
        "nombre": data.nombre.strip(),
        "nit": data.nit.strip(),
        "email": data.email.lower(),
        "telefono": data.telefono.strip(),
        "activo": data.activo,
        "creado_en": now,
        "actualizado_en": now
    }

    res = await db.proveedores.insert_one(doc)
    return {**doc, "id": str(res.inserted_id)}

@router.get("/{supplier_id}")
async def get_supplier(
    supplier_id: str,
    current_user: CurrentUser = Depends(require_role("Compras")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.proveedores.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise NotFoundException("Proveedor no encontrado")
    return {
        "id": str(doc["_id"]),
        "codigo": doc["codigo"],
        "nombre": doc["nombre"],
        "nit": doc["nit"],
        "email": doc["email"],
        "telefono": doc["telefono"],
        "activo": doc.get("activo", True),
        "creado_en": doc.get("creado_en"),
        "actualizado_en": doc.get("actualizado_en")
    }

@router.patch("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    data: SupplierUpdate,
    current_user: CurrentUser = Depends(require_role("Compras")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.proveedores.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise NotFoundException("Proveedor no encontrado")

    update_fields = {"actualizado_en": datetime.now(timezone.utc)}
    if data.nombre is not None:
        update_fields["nombre"] = data.nombre.strip()
    if data.nit is not None:
        update_fields["nit"] = data.nit.strip()
    if data.email is not None:
        update_fields["email"] = data.email.lower()
    if data.telefono is not None:
        update_fields["telefono"] = data.telefono.strip()
    if data.activo is not None:
        update_fields["activo"] = data.activo

    await db.proveedores.update_one({"_id": ObjectId(supplier_id)}, {"$set": update_fields})
    updated = await db.proveedores.find_one({"_id": ObjectId(supplier_id)})
    return {
        "id": str(updated["_id"]),
        "codigo": updated["codigo"],
        "nombre": updated["nombre"],
        "nit": updated["nit"],
        "email": updated["email"],
        "telefono": updated["telefono"],
        "activo": updated.get("activo", True),
        "creado_en": updated.get("creado_en"),
        "actualizado_en": updated.get("actualizado_en")
    }
