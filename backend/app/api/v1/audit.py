from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from app.core.database import get_database
from app.api.deps import require_role, CurrentUser

router = APIRouter(prefix="/audit", tags=["Bitácora de Seguridad (Administrador)"])

@router.get("/security")
async def get_security_audit(
    email: Optional[str] = Query(None, description="Filtrar por correo"),
    evento: Optional[str] = Query(None, description="Filtrar por evento"),
    page: int = Query(1, ge=1),
    size: int = Query(15, ge=1, le=100),
    current_user: CurrentUser = Depends(require_role("Administrador")),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filtro = {}
    if email:
        filtro["email"] = {"$regex": email, "$options": "i"}
    if evento:
        filtro["evento"] = evento

    total = await db.bitacora_seguridad.count_documents(filtro)
    skip = (page - 1) * size
    cursor = db.bitacora_seguridad.find(filtro).sort("fecha", -1).skip(skip).limit(size)

    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "evento": doc["evento"],
            "usuario_id": doc.get("usuario_id"),
            "email": doc["email"],
            "ip": doc["ip"],
            "dispositivo_id": doc.get("dispositivo_id"),
            "exito": doc.get("exito", True),
            "detalle": doc.get("detalle", ""),
            "fecha": doc.get("fecha")
        })

    pages = (total + size - 1) // size if size > 0 else 1
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
