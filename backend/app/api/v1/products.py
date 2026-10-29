from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.api.deps import require_permission, CurrentUser
from app.models.product import ProductCreate, ProductUpdate

router = APIRouter(prefix="/products", tags=["Catálogo de Productos"])

@router.get("")
async def list_products(
    q: Optional[str] = Query(None, description="Búsqueda por código o nombre"),
    activo: Optional[bool] = Query(None, description="Filtro por activo"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("Consultar inventario y productos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filtro = {}
    if q:
        filtro["$or"] = [
            {"codigo": {"$regex": q, "$options": "i"}},
            {"nombre": {"$regex": q, "$options": "i"}}
        ]
    if activo is not None:
        filtro["activo"] = activo

    total = await db.productos.count_documents(filtro)
    skip = (page - 1) * size
    cursor = db.productos.find(filtro).sort("codigo", 1).skip(skip).limit(size)

    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "codigo": doc["codigo"],
            "nombre": doc["nombre"],
            "descripcion": doc.get("descripcion", ""),
            "unidad": doc.get("unidad", "unidad"),
            "activo": doc.get("activo", True),
            "creado_en": doc.get("creado_en"),
            "actualizado_en": doc.get("actualizado_en")
        })

    pages = (total + size - 1) // size if size > 0 else 1
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

@router.post("")
async def create_product(
    data: ProductCreate,
    current_user: CurrentUser = Depends(require_permission("Crear / editar / cancelar productos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    codigo = data.codigo.strip().upper()
    existing = await db.productos.find_one({"codigo": codigo})
    if existing:
        raise ConflictException(f"Ya existe un producto con el código '{codigo}'.", codigo="DUPLICATE_PRODUCT_CODE")

    now = datetime.now(timezone.utc)
    doc = {
        "codigo": codigo,
        "nombre": data.nombre.strip(),
        "descripcion": data.descripcion.strip() if data.descripcion else "",
        "unidad": data.unidad.strip() if data.unidad else "unidad",
        "activo": data.activo,
        "creado_en": now,
        "actualizado_en": now
    }

    res = await db.productos.insert_one(doc)
    prod_id = str(res.inserted_id)

    # Inicializar registro de inventario en 0
    await db.inventario.insert_one({
        "producto_id": prod_id,
        "codigo": codigo,
        "nombre": data.nombre.strip(),
        "cantidad": 0,
        "actualizado_en": now
    })

    return {**doc, "id": prod_id}

@router.get("/{product_id}")
async def get_product(
    product_id: str,
    current_user: CurrentUser = Depends(require_permission("Consultar inventario y productos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.productos.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise NotFoundException("Producto no encontrado")
    return {
        "id": str(doc["_id"]),
        "codigo": doc["codigo"],
        "nombre": doc["nombre"],
        "descripcion": doc.get("descripcion", ""),
        "unidad": doc.get("unidad", "unidad"),
        "activo": doc.get("activo", True),
        "creado_en": doc.get("creado_en"),
        "actualizado_en": doc.get("actualizado_en")
    }

@router.patch("/{product_id}")
async def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: CurrentUser = Depends(require_permission("Crear / editar / cancelar productos")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.productos.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise NotFoundException("Producto no encontrado")

    update_fields = {"actualizado_en": datetime.now(timezone.utc)}
    if data.nombre is not None:
        update_fields["nombre"] = data.nombre.strip()
    if data.descripcion is not None:
        update_fields["descripcion"] = data.descripcion.strip()
    if data.unidad is not None:
        update_fields["unidad"] = data.unidad.strip()
    if data.activo is not None:
        update_fields["activo"] = data.activo

    await db.productos.update_one({"_id": ObjectId(product_id)}, {"$set": update_fields})

    # Si cambió nombre, actualizar en inventario
    if data.nombre is not None:
        await db.inventario.update_one(
            {"producto_id": product_id},
            {"$set": {"nombre": data.nombre.strip(), "actualizado_en": datetime.now(timezone.utc)}}
        )

    updated = await db.productos.find_one({"_id": ObjectId(product_id)})
    return {
        "id": str(updated["_id"]),
        "codigo": updated["codigo"],
        "nombre": updated["nombre"],
        "descripcion": updated.get("descripcion", ""),
        "unidad": updated.get("unidad", "unidad"),
        "activo": updated.get("activo", True),
        "creado_en": updated.get("creado_en"),
        "actualizado_en": updated.get("actualizado_en")
    }
