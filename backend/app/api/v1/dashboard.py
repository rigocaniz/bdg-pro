from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import get_current_user, CurrentUser

router = APIRouter(prefix="/dashboard", tags=["Panel de Inicio"])

@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Retorna métricas para las tarjetas de la pantalla P07."""
    filtro_solicitudes = {}
    if "Proveedor" in current_user.roles and not current_user.has_role("Administrador"):
        filtro_solicitudes["proveedor_id"] = current_user.proveedor_id

    # 1. Conteo de solicitudes por estado
    pipeline = [
        {"$match": filtro_solicitudes},
        {"$group": {"_id": "$estado", "total": {"$sum": 1}}}
    ]
    cursor = db.solicitudes.aggregate(pipeline)
    estados_conteo = {}
    async for doc in cursor:
        estados_conteo[doc["_id"]] = doc["total"]

    # 2. Entregas próximas (siguientes 7 días)
    hoy = date.today()
    limite = hoy + timedelta(days=7)
    hoy_str = hoy.isoformat()
    limite_str = limite.isoformat()

    filtro_proximas = {
        **filtro_solicitudes,
        "fecha_entrega": {"$gte": hoy_str, "$lte": limite_str},
        "estado": {"$in": ["Enviada", "Por entregar", "Entregada parcial"]}
    }
    cursor_proximas = db.solicitudes.find(filtro_proximas).sort("fecha_entrega", 1).limit(6)
    proximas_entregas = []

    # Cache de proveedores
    provs = {}
    async for p in db.proveedores.find():
        provs[str(p["_id"])] = p["nombre"]

    async for doc in cursor_proximas:
        proximas_entregas.append({
            "id": str(doc["_id"]),
            "numero": doc["numero"],
            "proveedor_nombre": provs.get(doc["proveedor_id"], ""),
            "fecha_entrega": doc["fecha_entrega"],
            "estado": doc["estado"],
            "total_lineas": len(doc.get("lineas", []))
        })

    # 3. Productos con inventario bajo (<= 15 unidades)
    cursor_bajos = db.inventario.find({"cantidad": {"$lte": 15}}).sort("cantidad", 1).limit(6)
    productos_bajos = []
    async for doc in cursor_bajos:
        productos_bajos.append({
            "producto_id": doc["producto_id"],
            "codigo": doc["codigo"],
            "nombre": doc["nombre"],
            "cantidad": doc.get("cantidad", 0)
        })

    # Total de productos en inventario
    total_inventario = await db.inventario.count_documents({})
    total_usuarios = await db.usuarios.count_documents({})

    return {
        "solicitudes_por_estado": estados_conteo,
        "proximas_entregas": proximas_entregas,
        "total_proximas_entregas": len(proximas_entregas),
        "productos_bajos": productos_bajos,
        "total_productos_bajos": len(productos_bajos),
        "total_inventario": total_inventario,
        "total_usuarios": total_usuarios
    }
