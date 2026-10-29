from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import NotFoundException, BadRequestException

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def list_users(
        self,
        q: Optional[str] = None,
        estado: Optional[str] = None,
        rol: Optional[str] = None,
        page: int = 1,
        size: int = 10
    ) -> Dict[str, Any]:
        filtro: Dict[str, Any] = {}
        if q:
            filtro["$or"] = [
                {"nombre": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}}
            ]
        if estado:
            filtro["estado"] = estado
        if rol:
            filtro["roles"] = rol

        total = await self.db.usuarios.count_documents(filtro)
        skip = (page - 1) * size
        cursor = self.db.usuarios.find(filtro).sort("creado_en", -1).skip(skip).limit(size)
        users = []
        async for doc in cursor:
            users.append({
                "id": str(doc["_id"]),
                "nombre": doc["nombre"],
                "email": doc["email"],
                "roles": doc.get("roles", []),
                "proveedor_id": doc.get("proveedor_id"),
                "estado": doc.get("estado", "activo"),
                "intentos_fallidos": doc.get("intentos_fallidos", 0),
                "bloqueado_hasta": doc.get("bloqueado_hasta"),
                "creado_en": doc.get("creado_en", datetime.utcnow())
            })

        pages = (total + size - 1) // size if size > 0 else 1
        return {
            "items": users,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }

    async def get_user_by_id(self, user_id: str) -> Dict[str, Any]:
        doc = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise NotFoundException("Usuario no encontrado")
        return {
            "id": str(doc["_id"]),
            "nombre": doc["nombre"],
            "email": doc["email"],
            "roles": doc.get("roles", []),
            "proveedor_id": doc.get("proveedor_id"),
            "estado": doc.get("estado", "activo"),
            "intentos_fallidos": doc.get("intentos_fallidos", 0),
            "bloqueado_hasta": doc.get("bloqueado_hasta"),
            "creado_en": doc.get("creado_en", datetime.utcnow())
        }

    async def update_user(self, user_id: str, data, admin_id: str) -> Dict[str, Any]:
        doc = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise NotFoundException("Usuario no encontrado")

        update_fields: Dict[str, Any] = {}
        if data.nombre is not None:
            update_fields["nombre"] = data.nombre.strip()
        if data.estado is not None:
            update_fields["estado"] = data.estado
            if data.estado == "activo":
                update_fields["intentos_fallidos"] = 0
                update_fields["bloqueado_hasta"] = None

        if update_fields:
            await self.db.usuarios.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
            await self.db.bitacora_seguridad.insert_one({
                "evento": "USER_UPDATED",
                "usuario_id": admin_id,
                "email": doc["email"],
                "ip": "127.0.0.1",
                "dispositivo_id": None,
                "exito": True,
                "detalle": f"Usuario modificado: {update_fields}",
                "fecha": datetime.now(timezone.utc)
            })

        return await self.get_user_by_id(user_id)

    async def update_roles(self, user_id: str, roles: List[str], proveedor_id: Optional[str], admin_id: str) -> Dict[str, Any]:
        """RF-SEG-05: Asignar o retirar roles; vincular usuarios con rol Proveedor a un proveedor."""
        doc = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise NotFoundException("Usuario no encontrado")

        # Si incluye rol 'Proveedor', debe tener un proveedor_id válido
        if "Proveedor" in roles and not proveedor_id and not doc.get("proveedor_id"):
            raise BadRequestException("Un usuario con rol Proveedor debe estar vinculado a un proveedor.", codigo="SUPPLIER_REQUIRED")

        update_data = {
            "roles": roles,
            "proveedor_id": proveedor_id if "Proveedor" in roles else None
        }

        await self.db.usuarios.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
        await self.db.bitacora_seguridad.insert_one({
            "evento": "ROLES_CHANGED",
            "usuario_id": admin_id,
            "email": doc["email"],
            "ip": "127.0.0.1",
            "dispositivo_id": None,
            "exito": True,
            "detalle": f"Roles actualizados a: {roles}, Proveedor: {proveedor_id}",
            "fecha": datetime.now(timezone.utc)
        })

        return await self.get_user_by_id(user_id)

    async def force_logout(self, user_id: str, admin_id: str) -> Dict[str, Any]:
        """RF-SEG-05: Forzar cierre de sesión de un usuario."""
        doc = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise NotFoundException("Usuario no encontrado")

        res = await self.db.sesiones.update_many(
            {"usuario_id": user_id, "activa": True},
            {"$set": {"activa": False}}
        )

        await self.db.bitacora_seguridad.insert_one({
            "evento": "FORCED_LOGOUT",
            "usuario_id": admin_id,
            "email": doc["email"],
            "ip": "127.0.0.1",
            "dispositivo_id": None,
            "exito": True,
            "detalle": f"Cierre forzado de {res.modified_count} sesiones por el Administrador",
            "fecha": datetime.now(timezone.utc)
        })

        return {
            "mensaje": f"Se han cerrado las sesiones activas del usuario {doc['email']}.",
            "sesiones_cerradas": res.modified_count
        }

    async def list_roles(self) -> List[Dict[str, Any]]:
        cursor = self.db.roles.find()
        roles = []
        async for doc in cursor:
            roles.append({
                "id": str(doc["_id"]),
                "nombre": doc["nombre"],
                "descripcion": doc.get("descripcion", ""),
                "permisos": doc.get("permisos", [])
            })
        return roles
