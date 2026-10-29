import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    logger.info(f"Conectando a MongoDB en: {settings.MONGO_URI}")
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_instance.db = db_instance.client[settings.MONGO_DB_NAME]
    try:
        # Ping a la base de datos
        await db_instance.client.admin.command('ping')
        logger.info("Conexión exitosa a MongoDB.")
        await init_indexes(db_instance.db)
    except Exception as e:
        logger.warning(f"Advertencia al conectar o crear índices de MongoDB: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("Conexión a MongoDB cerrada.")

def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db

async def init_indexes(db: AsyncIOMotorDatabase):
    """
    Crea los índices según la Sección 7 del documento de especificación.
    Incluyendo índices únicos parciales para la regla de sesión única.
    """
    try:
        # 1. usuarios: email único
        await db.usuarios.create_indexes([
            IndexModel([("email", ASCENDING)], unique=True, name="idx_usuarios_email_unique")
        ])

        # 2. roles: nombre único
        await db.roles.create_indexes([
            IndexModel([("nombre", ASCENDING)], unique=True, name="idx_roles_nombre_unique")
        ])

        # 3. sesiones:
        # Índice único parcial por usuario_id donde activa == true (un usuario solo una sesión activa)
        # Índice único parcial por dispositivo_id donde activa == true (un dispositivo solo una sesión activa)
        # TTL en expira_en
        await db.sesiones.create_indexes([
            IndexModel(
                [("usuario_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"activa": True},
                name="idx_sesiones_usuario_activa_unique"
            ),
            IndexModel(
                [("dispositivo_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"activa": True},
                name="idx_sesiones_dispositivo_activa_unique"
            ),
            IndexModel([("expira_en", ASCENDING)], expireAfterSeconds=0, name="idx_sesiones_ttl")
        ])

        # 4. tokens_verificacion: TTL en expira_en
        await db.tokens_verificacion.create_indexes([
            IndexModel([("expira_en", ASCENDING)], expireAfterSeconds=0, name="idx_tokens_ttl"),
            IndexModel([("usuario_id", ASCENDING), ("tipo", ASCENDING)], name="idx_tokens_user_tipo")
        ])

        # 5. productos: codigo único, texto en nombre
        await db.productos.create_indexes([
            IndexModel([("codigo", ASCENDING)], unique=True, name="idx_productos_codigo_unique"),
            IndexModel([("nombre", TEXT)], name="idx_productos_nombre_text")
        ])

        # 6. proveedores: codigo único
        await db.proveedores.create_indexes([
            IndexModel([("codigo", ASCENDING)], unique=True, name="idx_proveedores_codigo_unique")
        ])

        # 7. solicitudes: numero único, proveedor_id + estado, fecha_entrega
        await db.solicitudes.create_indexes([
            IndexModel([("numero", ASCENDING)], unique=True, name="idx_solicitudes_numero_unique"),
            IndexModel([("proveedor_id", ASCENDING), ("estado", ASCENDING)], name="idx_solicitudes_prov_estado"),
            IndexModel([("fecha_entrega", ASCENDING)], name="idx_solicitudes_fecha_entrega")
        ])

        # 8. inventario: producto_id único
        await db.inventario.create_indexes([
            IndexModel([("producto_id", ASCENDING)], unique=True, name="idx_inventario_producto_unique"),
            IndexModel([("codigo", ASCENDING)], name="idx_inventario_codigo")
        ])

        # 9. movimientos: solicitud_id + fecha, tipo + fecha
        await db.movimientos.create_indexes([
            IndexModel([("solicitud_id", ASCENDING), ("fecha", DESCENDING)], name="idx_movimientos_solicitud_fecha"),
            IndexModel([("tipo", ASCENDING), ("fecha", DESCENDING)], name="idx_movimientos_tipo_fecha")
        ])

        # 10. bitacora_seguridad: fecha, usuario_id
        await db.bitacora_seguridad.create_indexes([
            IndexModel([("fecha", DESCENDING)], name="idx_bitacora_fecha"),
            IndexModel([("usuario_id", ASCENDING)], name="idx_bitacora_usuario")
        ])

        logger.info("Índices de colecciones en MongoDB creados exitosamente.")
    except Exception as e:
        logger.error(f"Error al inicializar índices: {e}")
