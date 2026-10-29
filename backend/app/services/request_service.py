from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    ConflictException
)
from app.core.state_machine import (
    validar_transicion,
    ESTADO_BORRADOR,
    ESTADO_ENVIADA,
    ESTADO_POR_ENTREGAR,
    ESTADO_ENTREGADA,
    ESTADO_ENTREGADA_PARCIAL,
    ESTADO_CERRADA_CON_FALTANTE,
    ESTADO_RECHAZADA,
    ESTADO_CANCELADA
)
from app.models.movement import MovementType
from app.services.email_service import EmailService

class RequestService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def _generar_correlativo(self) -> str:
        """Genera número correlativo único en formato SOL-YYYY-XXXXXX."""
        anio = datetime.utcnow().year
        prefijo = f"SOL-{anio}-"
        # Contar cuántas solicitudes existen este año
        conteo = await self.db.solicitudes.count_documents({"numero": {"$regex": f"^{prefijo}"}})
        correlativo = conteo + 1
        return f"{prefijo}{correlativo:06d}"

    async def _obtener_nombre_usuario(self, user_id: str) -> str:
        try:
            u = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
            return u["nombre"] if u else "Sistema"
        except Exception:
            return "Sistema"

    async def _obtener_nombre_proveedor(self, proveedor_id: str) -> str:
        try:
            p = await self.db.proveedores.find_one({"_id": ObjectId(proveedor_id)})
            return p["nombre"] if p else ""
        except Exception:
            return ""

    async def create_request(self, data, user_id: str) -> Dict[str, Any]:
        """RF-NEG-02: Crear solicitud a proveedor (rol Compras)."""
        # Validar proveedor activo
        proveedor = await self.db.proveedores.find_one({"_id": ObjectId(data.proveedor_id), "activo": True})
        if not proveedor:
            raise BadRequestException("El proveedor seleccionado no existe o no se encuentra activo.", codigo="SUPPLIER_INACTIVE")

        # Validar fecha no anterior a hoy
        hoy = date.today()
        if data.fecha_entrega < hoy:
            raise BadRequestException("La fecha de entrega requerida no puede ser anterior a la fecha actual.", codigo="INVALID_DELIVERY_DATE")

        if not data.lineas:
            raise BadRequestException("La solicitud debe incluir al menos una línea de producto.", codigo="NO_LINES")

        # Validar productos no repetidos y cantidades > 0
        vistos = set()
        lineas_db = []
        for l in data.lineas:
            if l.producto_id in vistos:
                raise BadRequestException("No se permite repetir productos en la misma solicitud.", codigo="DUPLICATE_PRODUCT")
            vistos.add(l.producto_id)

            prod = await self.db.productos.find_one({"_id": ObjectId(l.producto_id), "activo": True})
            if not prod:
                raise BadRequestException(f"El producto con ID {l.producto_id} no existe o está inactivo.", codigo="PRODUCT_NOT_FOUND")

            if l.cant_solicitada <= 0:
                raise BadRequestException("La cantidad solicitada debe ser mayor a 0.", codigo="INVALID_QUANTITY")

            lineas_db.append({
                "producto_id": str(prod["_id"]),
                "codigo": prod["codigo"],
                "nombre": prod["nombre"],
                "cant_solicitada": l.cant_solicitada,
                "cant_confirmada": 0,
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None,
                "fecha_estimada": None,
                "comentario_proveedor": None
            })

        ahora = datetime.now(timezone.utc)
        estado_inicial = ESTADO_ENVIADA if data.enviar_inmediatamente else ESTADO_BORRADOR
        numero = await self._generar_correlativo()

        doc = {
            "numero": numero,
            "proveedor_id": str(proveedor["_id"]),
            "fecha_entrega": data.fecha_entrega.isoformat(),
            "estado": estado_inicial,
            "observaciones": (data.observaciones or "").strip(),
            "creado_por": user_id,
            "lineas": lineas_db,
            "motivo_rechazo_cancelacion": None,
            "creado_en": ahora,
            "actualizado_en": ahora
        }

        res = await self.db.solicitudes.insert_one(doc)
        solicitud_id = str(res.inserted_id)
        usuario_nombre = await self._obtener_nombre_usuario(user_id)

        # Registrar movimiento de creación
        await self.db.movimientos.insert_one({
            "tipo": MovementType.PEDIDO_CREADO,
            "solicitud_id": solicitud_id,
            "numero_solicitud": numero,
            "proveedor_id": str(proveedor["_id"]),
            "proveedor_nombre": proveedor["nombre"],
            "estado_anterior": None,
            "estado_nuevo": estado_inicial,
            "usuario_id": user_id,
            "usuario_nombre": usuario_nombre,
            "comentario": f"Solicitud creada como {estado_inicial}",
            "fecha": ahora
        })

        if estado_inicial == ESTADO_ENVIADA:
            EmailService.send_notification(
                proveedor["email"],
                f"Nueva solicitud de compra {numero}",
                f"Se le ha enviado la solicitud {numero} con fecha de entrega {data.fecha_entrega}. Ingrese al sistema para confirmar las cantidades."
            )

        return await self.get_request_by_id(solicitud_id)

    async def update_request_draft(self, solicitud_id: str, data, user_id: str) -> Dict[str, Any]:
        """Edita una solicitud mientras permanezca en estado Borrador."""
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        if solicitud["estado"] != ESTADO_BORRADOR:
            raise ConflictException("Solo se pueden editar solicitudes en estado Borrador.", codigo="NOT_A_DRAFT")

        update_fields: Dict[str, Any] = {"actualizado_en": datetime.now(timezone.utc)}

        if data.proveedor_id:
            proveedor = await self.db.proveedores.find_one({"_id": ObjectId(data.proveedor_id), "activo": True})
            if not proveedor:
                raise BadRequestException("Proveedor inválido o inactivo")
            update_fields["proveedor_id"] = str(proveedor["_id"])

        if data.fecha_entrega:
            if data.fecha_entrega < date.today():
                raise BadRequestException("La fecha de entrega requerida no puede ser anterior a hoy.")
            update_fields["fecha_entrega"] = data.fecha_entrega.isoformat()

        if data.observaciones is not None:
            update_fields["observaciones"] = data.observaciones.strip()

        if data.lineas is not None:
            vistos = set()
            lineas_db = []
            for l in data.lineas:
                if l.producto_id in vistos:
                    raise BadRequestException("No se permite repetir productos en la misma solicitud.")
                vistos.add(l.producto_id)
                prod = await self.db.productos.find_one({"_id": ObjectId(l.producto_id), "activo": True})
                if not prod:
                    raise BadRequestException(f"Producto {l.producto_id} no encontrado")
                lineas_db.append({
                    "producto_id": str(prod["_id"]),
                    "codigo": prod["codigo"],
                    "nombre": prod["nombre"],
                    "cant_solicitada": l.cant_solicitada,
                    "cant_confirmada": 0,
                    "cant_recibida": 0,
                    "recibido": False,
                    "motivo": None,
                    "fecha_estimada": None,
                    "comentario_proveedor": None
                })
            update_fields["lineas"] = lineas_db

        await self.db.solicitudes.update_one({"_id": ObjectId(solicitud_id)}, {"$set": update_fields})
        return await self.get_request_by_id(solicitud_id)

    async def send_to_supplier(self, solicitud_id: str, user_id: str) -> Dict[str, Any]:
        """Pasa la solicitud de Borrador a Enviada y notifica al proveedor."""
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        validar_transicion(solicitud["estado"], ESTADO_ENVIADA)

        ahora = datetime.now(timezone.utc)
        await self.db.solicitudes.update_one(
            {"_id": ObjectId(solicitud_id)},
            {"$set": {"estado": ESTADO_ENVIADA, "actualizado_en": ahora}}
        )

        proveedor = await self.db.proveedores.find_one({"_id": ObjectId(solicitud["proveedor_id"])})
        usuario_nombre = await self._obtener_nombre_usuario(user_id)

        await self.db.movimientos.insert_one({
            "tipo": MovementType.ESTADO_CAMBIADO,
            "solicitud_id": solicitud_id,
            "numero_solicitud": solicitud["numero"],
            "proveedor_id": solicitud["proveedor_id"],
            "proveedor_nombre": proveedor["nombre"] if proveedor else "",
            "estado_anterior": solicitud["estado"],
            "estado_nuevo": ESTADO_ENVIADA,
            "usuario_id": user_id,
            "usuario_nombre": usuario_nombre,
            "comentario": "Solicitud enviada al proveedor",
            "fecha": ahora
        })

        if proveedor and proveedor.get("email"):
            EmailService.send_notification(
                proveedor["email"],
                f"Nueva solicitud recibida: {solicitud['numero']}",
                f"Se le ha enviado la solicitud {solicitud['numero']} para su confirmación."
            )

        return await self.get_request_by_id(solicitud_id)

    async def cancel_request(self, solicitud_id: str, motivo: str, user_id: str) -> Dict[str, Any]:
        """Cancela la solicitud indicando motivo (Compras)."""
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        validar_transicion(solicitud["estado"], ESTADO_CANCELADA)

        ahora = datetime.now(timezone.utc)
        await self.db.solicitudes.update_one(
            {"_id": ObjectId(solicitud_id)},
            {"$set": {
                "estado": ESTADO_CANCELADA,
                "motivo_rechazo_cancelacion": motivo.strip(),
                "actualizado_en": ahora
            }}
        )

        proveedor_nombre = await self._obtener_nombre_proveedor(solicitud["proveedor_id"])
        usuario_nombre = await self._obtener_nombre_usuario(user_id)

        await self.db.movimientos.insert_one({
            "tipo": MovementType.ESTADO_CAMBIADO,
            "solicitud_id": solicitud_id,
            "numero_solicitud": solicitud["numero"],
            "proveedor_id": solicitud["proveedor_id"],
            "proveedor_nombre": proveedor_nombre,
            "estado_anterior": solicitud["estado"],
            "estado_nuevo": ESTADO_CANCELADA,
            "usuario_id": user_id,
            "usuario_nombre": usuario_nombre,
            "comentario": f"Cancelada por Compras. Motivo: {motivo}",
            "fecha": ahora
        })

        return await self.get_request_by_id(solicitud_id)

    async def confirm_by_supplier(
        self,
        solicitud_id: str,
        payload,
        user_id: str,
        proveedor_id_usuario: Optional[str]
    ) -> Dict[str, Any]:
        """RF-NEG-03: Confirmación del proveedor."""
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        # El rol Proveedor solo puede confirmar las solicitudes dirigidas a su proveedor
        if proveedor_id_usuario and solicitud["proveedor_id"] != proveedor_id_usuario:
            raise ForbiddenException("No tiene permiso para confirmar solicitudes dirigidas a otro proveedor.")

        validar_transicion(solicitud["estado"], ESTADO_POR_ENTREGAR)

        # Mapa de confirmaciones por producto_id
        confirmaciones = {c.producto_id: c for c in payload.lineas}
        lineas_actualizadas = []
        es_parcial = False

        for linea in solicitud["lineas"]:
            pid = linea["producto_id"]
            if pid in confirmaciones:
                conf = confirmaciones[pid]
                if conf.cant_confirmada < 0 or conf.cant_confirmada > linea["cant_solicitada"]:
                    raise BadRequestException(
                        f"La cantidad confirmada para '{linea['nombre']}' debe estar entre 0 y {linea['cant_solicitada']}.",
                        codigo="INVALID_CONFIRMED_QUANTITY"
                    )
                linea["cant_confirmada"] = conf.cant_confirmada
                if conf.fecha_estimada:
                    linea["fecha_estimada"] = conf.fecha_estimada.isoformat()
                if conf.comentario:
                    linea["comentario_proveedor"] = conf.comentario.strip()
                if conf.cant_confirmada < linea["cant_solicitada"]:
                    es_parcial = True
            else:
                # Si no vino en la lista, queda en 0
                linea["cant_confirmada"] = 0
                es_parcial = True

            lineas_actualizadas.append(linea)

        ahora = datetime.now(timezone.utc)
        await self.db.solicitudes.update_one(
            {"_id": ObjectId(solicitud_id)},
            {"$set": {
                "estado": ESTADO_POR_ENTREGAR,
                "lineas": lineas_actualizadas,
                "actualizado_en": ahora
            }}
        )

        proveedor_nombre = await self._obtener_nombre_proveedor(solicitud["proveedor_id"])
        usuario_nombre = await self._obtener_nombre_usuario(user_id)

        # Registrar movimiento de confirmación
        detalle_conf = f"Proveedor confirmó cantidades. {'(Confirmación parcial)' if es_parcial else '(Confirmación total)'}."
        if payload.comentario_general:
            detalle_conf += f" Comentario: {payload.comentario_general}"

        await self.db.movimientos.insert_one({
            "tipo": MovementType.CONFIRMACION,
            "solicitud_id": solicitud_id,
            "numero_solicitud": solicitud["numero"],
            "proveedor_id": solicitud["proveedor_id"],
            "proveedor_nombre": proveedor_nombre,
            "estado_anterior": solicitud["estado"],
            "estado_nuevo": ESTADO_POR_ENTREGAR,
            "usuario_id": user_id,
            "usuario_nombre": usuario_nombre,
            "comentario": detalle_conf,
            "fecha": ahora
        })

        # Notificar a Compras
        EmailService.send_notification(
            "compras@sistema.com",
            f"Solicitud {solicitud['numero']} confirmada por el proveedor",
            f"El proveedor {proveedor_nombre} ha confirmado las cantidades de la solicitud {solicitud['numero']} ({'Parcial' if es_parcial else 'Completa'})."
        )

        return await self.get_request_by_id(solicitud_id)

    async def reject_by_supplier(
        self,
        solicitud_id: str,
        motivo: str,
        user_id: str,
        proveedor_id_usuario: Optional[str]
    ) -> Dict[str, Any]:
        """Rechaza la solicitud completa con motivo (Proveedor)."""
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        if proveedor_id_usuario and solicitud["proveedor_id"] != proveedor_id_usuario:
            raise ForbiddenException("No tiene permiso para rechazar solicitudes dirigidas a otro proveedor.")

        validar_transicion(solicitud["estado"], ESTADO_RECHAZADA)

        ahora = datetime.now(timezone.utc)
        await self.db.solicitudes.update_one(
            {"_id": ObjectId(solicitud_id)},
            {"$set": {
                "estado": ESTADO_RECHAZADA,
                "motivo_rechazo_cancelacion": motivo.strip(),
                "actualizado_en": ahora
            }}
        )

        proveedor_nombre = await self._obtener_nombre_proveedor(solicitud["proveedor_id"])
        usuario_nombre = await self._obtener_nombre_usuario(user_id)

        await self.db.movimientos.insert_one({
            "tipo": MovementType.ESTADO_CAMBIADO,
            "solicitud_id": solicitud_id,
            "numero_solicitud": solicitud["numero"],
            "proveedor_id": solicitud["proveedor_id"],
            "proveedor_nombre": proveedor_nombre,
            "estado_anterior": solicitud["estado"],
            "estado_nuevo": ESTADO_RECHAZADA,
            "usuario_id": user_id,
            "usuario_nombre": usuario_nombre,
            "comentario": f"Rechazada por el proveedor. Motivo: {motivo}",
            "fecha": ahora
        })

        EmailService.send_notification(
            "compras@sistema.com",
            f"Solicitud {solicitud['numero']} RECHAZADA por el proveedor",
            f"El proveedor {proveedor_nombre} ha rechazado la solicitud {solicitud['numero']}. Motivo: {motivo}."
        )

        return await self.get_request_by_id(solicitud_id)

    async def close_with_shortage(self, solicitud_id: str, motivo: str, user_id: str) -> Dict[str, Any]:
        """Cierra una solicitud en Entrega Parcial sin esperar más entregas (Compras)."""
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        validar_transicion(solicitud["estado"], ESTADO_CERRADA_CON_FALTANTE)

        ahora = datetime.now(timezone.utc)
        await self.db.solicitudes.update_one(
            {"_id": ObjectId(solicitud_id)},
            {"$set": {
                "estado": ESTADO_CERRADA_CON_FALTANTE,
                "motivo_rechazo_cancelacion": motivo.strip(),
                "actualizado_en": ahora
            }}
        )

        proveedor_nombre = await self._obtener_nombre_proveedor(solicitud["proveedor_id"])
        usuario_nombre = await self._obtener_nombre_usuario(user_id)

        await self.db.movimientos.insert_one({
            "tipo": MovementType.ESTADO_CAMBIADO,
            "solicitud_id": solicitud_id,
            "numero_solicitud": solicitud["numero"],
            "proveedor_id": solicitud["proveedor_id"],
            "proveedor_nombre": proveedor_nombre,
            "estado_anterior": solicitud["estado"],
            "estado_nuevo": ESTADO_CERRADA_CON_FALTANTE,
            "usuario_id": user_id,
            "usuario_nombre": usuario_nombre,
            "comentario": f"Cerrada con faltante por Compras. Motivo: {motivo}",
            "fecha": ahora
        })

        return await self.get_request_by_id(solicitud_id)

    async def get_request_by_id(self, solicitud_id: str) -> Dict[str, Any]:
        doc = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not doc:
            raise NotFoundException("Solicitud no encontrada")

        prov = await self.db.proveedores.find_one({"_id": ObjectId(doc["proveedor_id"])})
        user = await self.db.usuarios.find_one({"_id": ObjectId(doc["creado_por"])})

        # Determinar si tiene confirmación parcial
        es_parcial = any(
            l.get("cant_confirmada", 0) < l.get("cant_solicitada", 0)
            for l in doc.get("lineas", [])
        ) and doc.get("estado") in [ESTADO_POR_ENTREGAR, ESTADO_ENTREGADA_PARCIAL, ESTADO_ENTREGADA]

        return {
            "id": str(doc["_id"]),
            "numero": doc["numero"],
            "proveedor_id": doc["proveedor_id"],
            "proveedor_nombre": prov["nombre"] if prov else "",
            "fecha_entrega": doc["fecha_entrega"],
            "estado": doc["estado"],
            "observaciones": doc.get("observaciones", ""),
            "creado_por": doc["creado_por"],
            "creado_por_nombre": user["nombre"] if user else "",
            "lineas": doc.get("lineas", []),
            "motivo_rechazo_cancelacion": doc.get("motivo_rechazo_cancelacion"),
            "es_confirmacion_parcial": es_parcial,
            "creado_en": doc.get("creado_en", datetime.utcnow()),
            "actualizado_en": doc.get("actualizado_en", datetime.utcnow())
        }

    async def list_requests(
        self,
        q: Optional[str] = None,
        estado: Optional[str] = None,
        proveedor_id: Optional[str] = None,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        page: int = 1,
        size: int = 10
    ) -> Dict[str, Any]:
        filtro: Dict[str, Any] = {}
        if q:
            filtro["$or"] = [
                {"numero": {"$regex": q, "$options": "i"}},
                {"observaciones": {"$regex": q, "$options": "i"}}
            ]
        if estado:
            filtro["estado"] = estado
        if proveedor_id:
            filtro["proveedor_id"] = proveedor_id
        if fecha_desde or fecha_hasta:
            fechas_query: Dict[str, Any] = {}
            if fecha_desde:
                fechas_query["$gte"] = fecha_desde
            if fecha_hasta:
                fechas_query["$lte"] = fecha_hasta
            filtro["fecha_entrega"] = fechas_query

        total = await self.db.solicitudes.count_documents(filtro)
        skip = (page - 1) * size
        cursor = self.db.solicitudes.find(filtro).sort("creado_en", -1).skip(skip).limit(size)
        items = []

        # Cache proveedores
        proveedores_cache = {}
        async for prov in self.db.proveedores.find():
            proveedores_cache[str(prov["_id"])] = prov["nombre"]

        async for doc in cursor:
            prov_nom = proveedores_cache.get(doc["proveedor_id"], "")
            es_parcial = any(
                l.get("cant_confirmada", 0) < l.get("cant_solicitada", 0)
                for l in doc.get("lineas", [])
            ) and doc.get("estado") in [ESTADO_POR_ENTREGAR, ESTADO_ENTREGADA_PARCIAL, ESTADO_ENTREGADA]

            items.append({
                "id": str(doc["_id"]),
                "numero": doc["numero"],
                "proveedor_id": doc["proveedor_id"],
                "proveedor_nombre": prov_nom,
                "fecha_entrega": doc["fecha_entrega"],
                "estado": doc["estado"],
                "observaciones": doc.get("observaciones", ""),
                "creado_por": doc["creado_por"],
                "lineas": doc.get("lineas", []),
                "motivo_rechazo_cancelacion": doc.get("motivo_rechazo_cancelacion"),
                "es_confirmacion_parcial": es_parcial,
                "creado_en": doc.get("creado_en", datetime.utcnow()),
                "actualizado_en": doc.get("actualizado_en", datetime.utcnow())
            })

        pages = (total + size - 1) // size if size > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }
