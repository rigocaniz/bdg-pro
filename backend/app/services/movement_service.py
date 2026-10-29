from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.movement import MovementType

class MovementService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def get_pedidos(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        proveedor_id: Optional[str] = None,
        producto_id: Optional[str] = None,
        numero_solicitud: Optional[str] = None,
        user_proveedor_id: Optional[str] = None,
        page: int = 1,
        size: int = 10
    ) -> Dict[str, Any]:
        """Pestaña 1: Pedidos."""
        filtro: Dict[str, Any] = {}

        # Si el usuario es proveedor, solo ve sus solicitudes
        if user_proveedor_id:
            filtro["proveedor_id"] = user_proveedor_id
        elif proveedor_id:
            filtro["proveedor_id"] = proveedor_id

        if numero_solicitud:
            filtro["numero"] = {"$regex": numero_solicitud, "$options": "i"}

        if producto_id:
            filtro["lineas.producto_id"] = producto_id

        if fecha_desde or fecha_hasta:
            fechas: Dict[str, Any] = {}
            if fecha_desde:
                fechas["$gte"] = datetime.fromisoformat(fecha_desde)
            if fecha_hasta:
                fechas["$lte"] = datetime.fromisoformat(fecha_hasta + "T23:59:59")
            filtro["creado_en"] = fechas

        total = await self.db.solicitudes.count_documents(filtro)
        skip = (page - 1) * size
        cursor = self.db.solicitudes.find(filtro).sort("creado_en", -1).skip(skip).limit(size)

        # Cache proveedores
        provs = {}
        async for p in self.db.proveedores.find():
            provs[str(p["_id"])] = p["nombre"]

        items = []
        async for doc in cursor:
            items.append({
                "id": str(doc["_id"]),
                "numero": doc["numero"],
                "proveedor_id": doc["proveedor_id"],
                "proveedor_nombre": provs.get(doc["proveedor_id"], ""),
                "fecha_creacion": doc.get("creado_en", datetime.utcnow()),
                "fecha_entrega": doc["fecha_entrega"],
                "estado": doc["estado"],
                "total_lineas": len(doc.get("lineas", [])),
                "lineas": doc.get("lineas", []),
                "observaciones": doc.get("observaciones", "")
            })

        pages = (total + size - 1) // size if size > 0 else 1
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

    async def get_productos_ingresados(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        proveedor_id: Optional[str] = None,
        producto_id: Optional[str] = None,
        numero_solicitud: Optional[str] = None,
        user_proveedor_id: Optional[str] = None,
        page: int = 1,
        size: int = 10
    ) -> Dict[str, Any]:
        """Pestaña 2: Productos ingresados al inventario."""
        filtro: Dict[str, Any] = {"tipo": MovementType.INGRESO_INVENTARIO}

        if user_proveedor_id:
            filtro["proveedor_id"] = user_proveedor_id
        elif proveedor_id:
            filtro["proveedor_id"] = proveedor_id

        if numero_solicitud:
            filtro["numero_solicitud"] = {"$regex": numero_solicitud, "$options": "i"}

        if producto_id:
            filtro["producto_id"] = producto_id

        if fecha_desde or fecha_hasta:
            fechas: Dict[str, Any] = {}
            if fecha_desde:
                fechas["$gte"] = datetime.fromisoformat(fecha_desde)
            if fecha_hasta:
                fechas["$lte"] = datetime.fromisoformat(fecha_hasta + "T23:59:59")
            filtro["fecha"] = fechas

        total = await self.db.movimientos.count_documents(filtro)
        skip = (page - 1) * size
        cursor = self.db.movimientos.find(filtro).sort("fecha", -1).skip(skip).limit(size)

        items = []
        async for doc in cursor:
            items.append({
                "id": str(doc["_id"]),
                "fecha_recepcion": doc.get("fecha"),
                "numero_solicitud": doc.get("numero_solicitud", ""),
                "solicitud_id": doc.get("solicitud_id"),
                "proveedor_nombre": doc.get("proveedor_nombre", ""),
                "codigo_producto": doc.get("codigo_producto", ""),
                "nombre_producto": doc.get("nombre_producto", ""),
                "cantidad": doc.get("cantidad", 0),
                "usuario_recibio": doc.get("usuario_nombre", "Bodega"),
                "comentario": doc.get("comentario", "")
            })

        pages = (total + size - 1) // size if size > 0 else 1
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

    async def get_cambios_timeline(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        proveedor_id: Optional[str] = None,
        producto_id: Optional[str] = None,
        numero_solicitud: Optional[str] = None,
        user_proveedor_id: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Dict[str, Any]:
        """Pestaña 3: Línea de tiempo de cambios desde pedido hasta entrega."""
        filtro: Dict[str, Any] = {}

        if user_proveedor_id:
            filtro["proveedor_id"] = user_proveedor_id
        elif proveedor_id:
            filtro["proveedor_id"] = proveedor_id

        if numero_solicitud:
            filtro["numero_solicitud"] = {"$regex": numero_solicitud, "$options": "i"}

        if producto_id:
            filtro["producto_id"] = producto_id

        if fecha_desde or fecha_hasta:
            fechas: Dict[str, Any] = {}
            if fecha_desde:
                fechas["$gte"] = datetime.fromisoformat(fecha_desde)
            if fecha_hasta:
                fechas["$lte"] = datetime.fromisoformat(fecha_hasta + "T23:59:59")
            filtro["fecha"] = fechas

        total = await self.db.movimientos.count_documents(filtro)
        skip = (page - 1) * size
        cursor = self.db.movimientos.find(filtro).sort("fecha", -1).skip(skip).limit(size)

        items = []
        async for doc in cursor:
            items.append({
                "id": str(doc["_id"]),
                "tipo": doc.get("tipo"),
                "solicitud_id": doc.get("solicitud_id"),
                "numero_solicitud": doc.get("numero_solicitud"),
                "proveedor_nombre": doc.get("proveedor_nombre"),
                "codigo_producto": doc.get("codigo_producto"),
                "nombre_producto": doc.get("nombre_producto"),
                "estado_anterior": doc.get("estado_anterior"),
                "estado_nuevo": doc.get("estado_nuevo"),
                "cantidad": doc.get("cantidad"),
                "usuario_nombre": doc.get("usuario_nombre"),
                "comentario": doc.get("comentario"),
                "fecha": doc.get("fecha")
            })

        pages = (total + size - 1) // size if size > 0 else 1
        return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
