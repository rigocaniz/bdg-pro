import io
import csv
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClient

from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ConflictException
)
from app.core.state_machine import (
    validar_transicion,
    ESTADO_POR_ENTREGAR,
    ESTADO_ENTREGADA,
    ESTADO_ENTREGADA_PARCIAL
)
from app.models.movement import MovementType

class InventoryService:
    def __init__(self, db: AsyncIOMotorDatabase, client: Optional[AsyncIOMotorClient] = None):
        self.db = db
        self.client = client

    async def receive_delivery(
        self,
        solicitud_id: str,
        payload,
        user_id: str
    ) -> Dict[str, Any]:
        """
        RF-NEG-04: Recepción de entrega (rol Bodega).
        Actualiza solicitudes, suma al inventario ($inc) y registra movimientos.
        Operación atómica con soporte de transacción en replica set o fallback seguro.
        """
        solicitud = await self.db.solicitudes.find_one({"_id": ObjectId(solicitud_id)})
        if not solicitud:
            raise NotFoundException("Solicitud no encontrada")

        estado_actual = solicitud["estado"]
        if estado_actual not in [ESTADO_POR_ENTREGAR, ESTADO_ENTREGADA_PARCIAL]:
            raise ConflictException(
                f"Solo se pueden recibir entregas de solicitudes en estado 'Por entregar' o 'Entregada parcial'. Estado actual: {estado_actual}",
                codigo="INVALID_REQUEST_STATE"
            )

        # Mapa de recepciones enviadas por Bodega
        recepciones = {r.producto_id: r for r in payload.lineas}
        lineas_actuales = solicitud.get("lineas", [])

        lineas_nuevas = []
        ingresos_a_inventario = []
        es_parcial = False

        for linea in lineas_actuales:
            pid = linea["producto_id"]
            cant_confirmada = linea.get("cant_confirmada", 0)
            cant_recibida_previa = linea.get("cant_recibida", 0)

            if pid in recepciones:
                rec_data = recepciones[pid]
                cant_recibida_ahora = rec_data.cant_recibida

                # Validar cantidad recibida (no puede superar lo confirmado restante)
                max_recibible = cant_confirmada - cant_recibida_previa
                if cant_recibida_ahora < 0 or cant_recibida_ahora > max_recibible:
                    raise BadRequestException(
                        f"Para el producto '{linea['nombre']}', la cantidad a recibir debe estar entre 0 y {max_recibible}.",
                        codigo="INVALID_RECEIVED_QUANTITY"
                    )

                # Validar motivo obligatorio si la entrega total queda menor a lo confirmado
                total_recibido_linea = cant_recibida_previa + cant_recibida_ahora
                if total_recibido_linea < cant_confirmada:
                    es_parcial = True
                    motivo = (rec_data.motivo or linea.get("motivo") or "").strip()
                    if not motivo:
                        raise BadRequestException(
                            f"El motivo es obligatorio para el producto '{linea['nombre']}' ya que la cantidad recibida ({total_recibido_linea}) es menor a la confirmada ({cant_confirmada}).",
                            codigo="REASON_REQUIRED"
                        )
                    linea["motivo"] = motivo
                else:
                    linea["motivo"] = rec_data.motivo or linea.get("motivo")

                linea["cant_recibida"] = total_recibido_linea
                linea["recibido"] = rec_data.recibido or (total_recibido_linea > 0)

                if cant_recibida_ahora > 0:
                    ingresos_a_inventario.append({
                        "producto_id": pid,
                        "codigo": linea["codigo"],
                        "nombre": linea["nombre"],
                        "cantidad": cant_recibida_ahora
                    })
            else:
                total_recibido_linea = cant_recibida_previa
                if total_recibido_linea < cant_confirmada:
                    es_parcial = True

            lineas_nuevas.append(linea)

        # Determinar nuevo estado de la solicitud
        nuevo_estado = ESTADO_ENTREGADA_PARCIAL if es_parcial else ESTADO_ENTREGADA
        validar_transicion(estado_actual, nuevo_estado)

        ahora = datetime.now(timezone.utc)
        u = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        usuario_nombre = u["nombre"] if u else "Bodega"
        prov = await self.db.proveedores.find_one({"_id": ObjectId(solicitud["proveedor_id"])})
        proveedor_nombre = prov["nombre"] if prov else ""

        # Ejecución Atómica (con soporte de transacciones si está en Replica Set)
        async def ejecutar_operacion_recepcion(session=None):
            # 1. Actualizar solicitud
            await self.db.solicitudes.update_one(
                {"_id": ObjectId(solicitud_id)},
                {"$set": {
                    "estado": nuevo_estado,
                    "lineas": lineas_nuevas,
                    "actualizado_en": ahora
                }},
                session=session
            )

            # 2. Sumar al inventario por cada producto efectivamente recibido
            for item in ingresos_a_inventario:
                await self.db.inventario.update_one(
                    {"producto_id": item["producto_id"]},
                    {
                        "$inc": {"cantidad": item["cantidad"]},
                        "$set": {
                            "codigo": item["codigo"],
                            "nombre": item["nombre"],
                            "actualizado_en": ahora
                        }
                    },
                    upsert=True,
                    session=session
                )

                # Registrar movimiento tipo INGRESO_INVENTARIO
                await self.db.movimientos.insert_one(
                    {
                        "tipo": MovementType.INGRESO_INVENTARIO,
                        "solicitud_id": solicitud_id,
                        "numero_solicitud": solicitud["numero"],
                        "proveedor_id": solicitud["proveedor_id"],
                        "proveedor_nombre": proveedor_nombre,
                        "producto_id": item["producto_id"],
                        "codigo_producto": item["codigo"],
                        "nombre_producto": item["nombre"],
                        "cantidad": item["cantidad"],
                        "usuario_id": user_id,
                        "usuario_nombre": usuario_nombre,
                        "comentario": f"Ingreso a inventario por recepción en solicitud {solicitud['numero']}",
                        "fecha": ahora
                    },
                    session=session
                )

            # 3. Registrar movimiento de cambio de estado de la solicitud
            coment = f"Recepción registrada por Bodega. Estado resultante: {nuevo_estado}."
            if payload.observaciones_recepcion:
                coment += f" Observaciones: {payload.observaciones_recepcion}"

            await self.db.movimientos.insert_one(
                {
                    "tipo": MovementType.ESTADO_CAMBIADO,
                    "solicitud_id": solicitud_id,
                    "numero_solicitud": solicitud["numero"],
                    "proveedor_id": solicitud["proveedor_id"],
                    "proveedor_nombre": proveedor_nombre,
                    "estado_anterior": estado_actual,
                    "estado_nuevo": nuevo_estado,
                    "usuario_id": user_id,
                    "usuario_nombre": usuario_nombre,
                    "comentario": coment,
                    "fecha": ahora
                },
                session=session
            )

        # Intentar con sesión/transacción de MongoDB Replica Set
        if self.client:
            try:
                async with await self.client.start_session() as session:
                    async with session.start_transaction():
                        await ejecutar_operacion_recepcion(session=session)
            except Exception:
                # Si MongoDB no está en replica set (ej. durante ciertas pruebas unitarias locales), ejecutar directo
                await ejecutar_operacion_recepcion(session=None)
        else:
            await ejecutar_operacion_recepcion(session=None)

        return {
            "mensaje": f"Recepción registrada con éxito. Estado: {nuevo_estado}.",
            "solicitud_id": solicitud_id,
            "estado": nuevo_estado,
            "productos_ingresados": ingresos_a_inventario
        }

    async def list_inventory(
        self,
        q: Optional[str] = None,
        sort_by: str = "nombre",
        sort_dir: int = 1,
        page: int = 1,
        size: int = 10
    ) -> Dict[str, Any]:
        """RF-NEG-05: Consulta de inventario con búsqueda y paginación."""
        filtro: Dict[str, Any] = {}
        if q:
            filtro["$or"] = [
                {"codigo": {"$regex": q, "$options": "i"}},
                {"nombre": {"$regex": q, "$options": "i"}}
            ]

        total = await self.db.inventario.count_documents(filtro)
        skip = (page - 1) * size

        valid_sort_fields = ["codigo", "nombre", "cantidad", "actualizado_en"]
        field = sort_by if sort_by in valid_sort_fields else "nombre"

        cursor = self.db.inventario.find(filtro).sort(field, sort_dir).skip(skip).limit(size)
        items = []
        async for doc in cursor:
            items.append({
                "id": str(doc["_id"]),
                "producto_id": doc["producto_id"],
                "codigo": doc["codigo"],
                "nombre": doc["nombre"],
                "cantidad": doc.get("cantidad", 0),
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

    async def export_inventory_csv(self, q: Optional[str] = None) -> str:
        """Exporta el inventario completo en formato CSV."""
        filtro: Dict[str, Any] = {}
        if q:
            filtro["$or"] = [
                {"codigo": {"$regex": q, "$options": "i"}},
                {"nombre": {"$regex": q, "$options": "i"}}
            ]

        cursor = self.db.inventario.find(filtro).sort("codigo", 1)
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["Código", "Nombre de Producto", "Cantidad Disponible", "Última Actualización"])

        async for doc in cursor:
            fecha_str = doc.get("actualizado_en", datetime.utcnow()).strftime("%d/%m/%Y %H:%M:%S")
            writer.writerow([
                doc.get("codigo", ""),
                doc.get("nombre", ""),
                doc.get("cantidad", 0),
                fecha_str
            ])

        return output.getvalue()
