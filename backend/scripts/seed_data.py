import asyncio
from datetime import datetime, date, timedelta, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import get_password_hash
from app.models.movement import MovementType

ROLES_DATA = [
    {
        "nombre": "Administrador",
        "descripcion": "Acceso total al sistema, gestión de usuarios, roles y auditoría.",
        "permisos": [
            "Gestionar usuarios y asignar roles",
            "Crear / editar / cancelar productos",
            "Crear / editar / cancelar solicitudes",
            "Enviar solicitud al proveedor",
            "Confirmar cantidades a entregar",
            "Registrar recepción de entrega",
            "Consultar inventario y productos",
            "Consultar movimientos",
            "Ver bitácora de seguridad"
        ]
    },
    {
        "nombre": "Compras",
        "descripcion": "Gestión de pedidos a proveedores y catálogo de productos.",
        "permisos": [
            "Crear / editar / cancelar productos",
            "Crear / editar / cancelar solicitudes",
            "Enviar solicitud al proveedor",
            "Consultar inventario y productos",
            "Consultar movimientos"
        ]
    },
    {
        "nombre": "Proveedor",
        "descripcion": "Confirmación y seguimiento de solicitudes recibidas.",
        "permisos": [
            "Confirmar cantidades a entregar",
            "Consultar movimientos"
        ]
    },
    {
        "nombre": "Bodega",
        "descripcion": "Recepción física de entregas e ingreso a inventario.",
        "permisos": [
            "Registrar recepción de entrega",
            "Consultar inventario y productos",
            "Consultar movimientos"
        ]
    },
    {
        "nombre": "Consulta",
        "descripcion": "Rol base de solo lectura para inventario, productos y movimientos.",
        "permisos": [
            "Consultar inventario y productos",
            "Consultar movimientos"
        ]
    }
]

PROVEEDORES_DATA = [
    {
        "codigo": "PRV-001",
        "nombre": "Distribuidora Central S.A.",
        "nit": "1029384-5",
        "email": "contacto@distribuidoracentral.com",
        "telefono": "+502 2233-4455",
        "activo": True
    },
    {
        "codigo": "PRV-002",
        "nombre": "Proveeduría Industrial S.A.",
        "nit": "9876543-2",
        "email": "proveedor@sistema.com",
        "telefono": "+502 2345-6789",
        "activo": True
    },
    {
        "codigo": "PRV-003",
        "nombre": "Logística y Suministros Global",
        "nit": "5544332-1",
        "email": "ventas@suministrosglobal.com",
        "telefono": "+502 2456-7890",
        "activo": True
    }
]

PRODUCTOS_DATA = [
    {"codigo": "PRD-001", "nombre": "Papel Bond Carta 75g (Resma)", "descripcion": "Resma de papel bond blanco 500 hojas tamaño carta.", "unidad": "resma", "activo": True, "stock_inicial": 80},
    {"codigo": "PRD-002", "nombre": "Bolígrafo Gel Azul 0.7mm (Caja x 12)", "descripcion": "Caja de bolígrafos tinta gel azul secado rápido.", "unidad": "caja", "activo": True, "stock_inicial": 45},
    {"codigo": "PRD-003", "nombre": "Marcador Permanente Negro (Caja x 10)", "descripcion": "Marcadores punta redonda indelebles para toda superficie.", "unidad": "caja", "activo": True, "stock_inicial": 10}, # Bajo
    {"codigo": "PRD-004", "nombre": "Cinta Adhesiva de Embalaje 48mm x 100m", "descripcion": "Cinta plástica transparente para embalaje pesado.", "unidad": "rollo", "activo": True, "stock_inicial": 30},
    {"codigo": "PRD-005", "nombre": "Tijera de Acero Inoxidable 8\"", "descripcion": "Tijera multiuso con mango ergonómico engomado.", "unidad": "unidad", "activo": True, "stock_inicial": 12}, # Bajo
    {"codigo": "PRD-006", "nombre": "Engrapadora Metálica de Escritorio", "descripcion": "Capacidad 25 hojas, estructura 100% metálica.", "unidad": "unidad", "activo": True, "stock_inicial": 25},
    {"codigo": "PRD-007", "nombre": "Grapas Estándar 26/6 (Caja x 5000)", "descripcion": "Grapas galvanizadas universales para engrapadora manual.", "unidad": "caja", "activo": True, "stock_inicial": 60},
    {"codigo": "PRD-008", "nombre": "Folder Manila Tamaño Carta (Paquete x 50)", "descripcion": "Carpetas de cartulina kraft con pestaña superior.", "unidad": "paquete", "activo": True, "stock_inicial": 8}, # Bajo
    {"codigo": "PRD-009", "nombre": "Sobres Manila Tamaño Oficio (Paquete x 25)", "descripcion": "Sobres con fuelle y broche de hilo.", "unidad": "paquete", "activo": True, "stock_inicial": 15}, # Bajo
    {"codigo": "PRD-010", "nombre": "Tóner Láser Negro Alto Rendimiento", "descripcion": "Cartucho de tóner compatible rendimiento 3,000 páginas.", "unidad": "cartucho", "activo": True, "stock_inicial": 5} # Bajo
]

async def seed_database_if_empty(db: AsyncIOMotorDatabase):
    """
    Verifica si existen roles o usuarios; si la base de datos está vacía,
    inserta los datos de ejemplo solicitados por la especificación.
    """
    roles_count = await db.roles.count_documents({})
    if roles_count > 0:
        return

    print("🌱 Sembrando base de datos con información inicial y de prueba...")
    now = datetime.now(timezone.utc)

    # 1. Insertar Roles
    for r in ROLES_DATA:
        await db.roles.insert_one(r)

    # 2. Insertar Proveedores
    prov_ids = {}
    for p in PROVEEDORES_DATA:
        p_copy = {**p, "creado_en": now, "actualizado_en": now}
        res = await db.proveedores.insert_one(p_copy)
        prov_ids[p["codigo"]] = str(res.inserted_id)

    # 3. Insertar Usuarios (uno por rol)
    default_pwd_hash = get_password_hash("Admin123!")

    usuarios_data = [
        {
            "nombre": "Administrador Principal",
            "email": "admin@sistema.com",
            "password_hash": default_pwd_hash,
            "roles": ["Administrador"],
            "proveedor_id": None,
            "estado": "activo",
            "intentos_fallidos": 0,
            "bloqueado_hasta": None,
            "historial_passwords": [default_pwd_hash],
            "creado_en": now
        },
        {
            "nombre": "Encargado de Compras",
            "email": "compras@sistema.com",
            "password_hash": default_pwd_hash,
            "roles": ["Compras"],
            "proveedor_id": None,
            "estado": "activo",
            "intentos_fallidos": 0,
            "bloqueado_hasta": None,
            "historial_passwords": [default_pwd_hash],
            "creado_en": now
        },
        {
            "nombre": "Representante Proveedor S.A.",
            "email": "proveedor@sistema.com",
            "password_hash": default_pwd_hash,
            "roles": ["Proveedor"],
            "proveedor_id": prov_ids["PRV-002"],  # Vinculado a Proveeduría Industrial S.A.
            "estado": "activo",
            "intentos_fallidos": 0,
            "bloqueado_hasta": None,
            "historial_passwords": [default_pwd_hash],
            "creado_en": now
        },
        {
            "nombre": "Operador de Bodega",
            "email": "bodega@sistema.com",
            "password_hash": default_pwd_hash,
            "roles": ["Bodega"],
            "proveedor_id": None,
            "estado": "activo",
            "intentos_fallidos": 0,
            "bloqueado_hasta": None,
            "historial_passwords": [default_pwd_hash],
            "creado_en": now
        },
        {
            "nombre": "Auditor de Consulta",
            "email": "consulta@sistema.com",
            "password_hash": default_pwd_hash,
            "roles": ["Consulta"],
            "proveedor_id": None,
            "estado": "activo",
            "intentos_fallidos": 0,
            "bloqueado_hasta": None,
            "historial_passwords": [default_pwd_hash],
            "creado_en": now
        }
    ]

    user_ids = {}
    for u in usuarios_data:
        res = await db.usuarios.insert_one(u)
        user_ids[u["email"]] = str(res.inserted_id)

    # 4. Insertar Productos e Inventario
    prod_docs = {}
    for prod in PRODUCTOS_DATA:
        stock = prod.pop("stock_inicial")
        prod_copy = {**prod, "creado_en": now, "actualizado_en": now}
        res = await db.productos.insert_one(prod_copy)
        pid = str(res.inserted_id)
        prod_docs[prod["codigo"]] = {**prod_copy, "id": pid}

        # Inicializar inventario
        await db.inventario.insert_one({
            "producto_id": pid,
            "codigo": prod["codigo"],
            "nombre": prod["nombre"],
            "cantidad": stock,
            "actualizado_en": now
        })

    # 5. Insertar 5 Solicitudes en estados distintos (con movimientos correspondientes)
    hoy = date.today()
    fecha_futura = (hoy + timedelta(days=5)).isoformat()
    fecha_pasada = (hoy - timedelta(days=2)).isoformat()

    # S1: Borrador
    s1 = {
        "numero": "SOL-2026-000001",
        "proveedor_id": prov_ids["PRV-001"],
        "fecha_entrega": (hoy + timedelta(days=4)).isoformat(),
        "estado": "Borrador",
        "observaciones": "Solicitud para reposición mensual de papelería en borrador.",
        "creado_por": user_ids["compras@sistema.com"],
        "lineas": [
            {
                "producto_id": prod_docs["PRD-001"]["id"],
                "codigo": prod_docs["PRD-001"]["codigo"],
                "nombre": prod_docs["PRD-001"]["nombre"],
                "cant_solicitada": 20,
                "cant_confirmada": 0,
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None
            },
            {
                "producto_id": prod_docs["PRD-002"]["id"],
                "codigo": prod_docs["PRD-002"]["codigo"],
                "nombre": prod_docs["PRD-002"]["nombre"],
                "cant_solicitada": 15,
                "cant_confirmada": 0,
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None
            }
        ],
        "motivo_rechazo_cancelacion": None,
        "creado_en": now - timedelta(hours=8),
        "actualizado_en": now - timedelta(hours=8)
    }
    r1 = await db.solicitudes.insert_one(s1)
    await db.movimientos.insert_one({
        "tipo": MovementType.PEDIDO_CREADO,
        "solicitud_id": str(r1.inserted_id),
        "numero_solicitud": s1["numero"],
        "proveedor_id": s1["proveedor_id"],
        "proveedor_nombre": "Distribuidora Central S.A.",
        "estado_nuevo": "Borrador",
        "usuario_id": user_ids["compras@sistema.com"],
        "usuario_nombre": "Encargado de Compras",
        "comentario": "Solicitud creada en borrador",
        "fecha": now - timedelta(hours=8)
    })

    # S2: Enviada (dirigida a Proveeduría Industrial S.A.)
    s2 = {
        "numero": "SOL-2026-000002",
        "proveedor_id": prov_ids["PRV-002"],
        "fecha_entrega": (hoy + timedelta(days=3)).isoformat(),
        "estado": "Enviada",
        "observaciones": "Requerimiento urgente de marcadores y cintas de embalaje.",
        "creado_por": user_ids["compras@sistema.com"],
        "lineas": [
            {
                "producto_id": prod_docs["PRD-003"]["id"],
                "codigo": prod_docs["PRD-003"]["codigo"],
                "nombre": prod_docs["PRD-003"]["nombre"],
                "cant_solicitada": 25,
                "cant_confirmada": 0,
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None
            },
            {
                "producto_id": prod_docs["PRD-004"]["id"],
                "codigo": prod_docs["PRD-004"]["codigo"],
                "nombre": prod_docs["PRD-004"]["nombre"],
                "cant_solicitada": 30,
                "cant_confirmada": 0,
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None
            }
        ],
        "motivo_rechazo_cancelacion": None,
        "creado_en": now - timedelta(hours=5),
        "actualizado_en": now - timedelta(hours=4)
    }
    r2 = await db.solicitudes.insert_one(s2)
    await db.movimientos.insert_one({
        "tipo": MovementType.PEDIDO_CREADO,
        "solicitud_id": str(r2.inserted_id),
        "numero_solicitud": s2["numero"],
        "proveedor_id": s2["proveedor_id"],
        "proveedor_nombre": "Proveeduría Industrial S.A.",
        "estado_nuevo": "Borrador",
        "usuario_id": user_ids["compras@sistema.com"],
        "usuario_nombre": "Encargado de Compras",
        "comentario": "Solicitud creada",
        "fecha": now - timedelta(hours=5)
    })
    await db.movimientos.insert_one({
        "tipo": MovementType.ESTADO_CAMBIADO,
        "solicitud_id": str(r2.inserted_id),
        "numero_solicitud": s2["numero"],
        "proveedor_id": s2["proveedor_id"],
        "proveedor_nombre": "Proveeduría Industrial S.A.",
        "estado_anterior": "Borrador",
        "estado_nuevo": "Enviada",
        "usuario_id": user_ids["compras@sistema.com"],
        "usuario_nombre": "Encargado de Compras",
        "comentario": "Solicitud enviada al proveedor para confirmación",
        "fecha": now - timedelta(hours=4)
    })

    # S3: Por entregar (con confirmación parcial para mostrar badge)
    s3 = {
        "numero": "SOL-2026-000003",
        "proveedor_id": prov_ids["PRV-002"],
        "fecha_entrega": (hoy + timedelta(days=2)).isoformat(),
        "estado": "Por entregar",
        "observaciones": "Entrega parcial programada en sede central.",
        "creado_por": user_ids["compras@sistema.com"],
        "lineas": [
            {
                "producto_id": prod_docs["PRD-005"]["id"],
                "codigo": prod_docs["PRD-005"]["codigo"],
                "nombre": prod_docs["PRD-005"]["nombre"],
                "cant_solicitada": 20,
                "cant_confirmada": 15,  # Confirmación parcial
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None,
                "fecha_estimada": (hoy + timedelta(days=2)).isoformat(),
                "comentario_proveedor": "Stock limitado, enviamos 15 de 20."
            },
            {
                "producto_id": prod_docs["PRD-006"]["id"],
                "codigo": prod_docs["PRD-006"]["codigo"],
                "nombre": prod_docs["PRD-006"]["nombre"],
                "cant_solicitada": 10,
                "cant_confirmada": 10,
                "cant_recibida": 0,
                "recibido": False,
                "motivo": None,
                "fecha_estimada": (hoy + timedelta(days=2)).isoformat(),
                "comentario_proveedor": "Disponibilidad completa."
            }
        ],
        "motivo_rechazo_cancelacion": None,
        "creado_en": now - timedelta(days=1),
        "actualizado_en": now - timedelta(hours=6)
    }
    r3 = await db.solicitudes.insert_one(s3)
    await db.movimientos.insert_one({
        "tipo": MovementType.CONFIRMACION,
        "solicitud_id": str(r3.inserted_id),
        "numero_solicitud": s3["numero"],
        "proveedor_id": s3["proveedor_id"],
        "proveedor_nombre": "Proveeduría Industrial S.A.",
        "estado_anterior": "Enviada",
        "estado_nuevo": "Por entregar",
        "usuario_id": user_ids["proveedor@sistema.com"],
        "usuario_nombre": "Representante Proveedor S.A.",
        "comentario": "Proveedor confirmó cantidades (Confirmación parcial).",
        "fecha": now - timedelta(hours=6)
    })

    # S4: Entregada parcial
    s4 = {
        "numero": "SOL-2026-000004",
        "proveedor_id": prov_ids["PRV-003"],
        "fecha_entrega": hoy.isoformat(),
        "estado": "Entregada parcial",
        "observaciones": "Entrega con faltante reportado en bodega.",
        "creado_por": user_ids["compras@sistema.com"],
        "lineas": [
            {
                "producto_id": prod_docs["PRD-007"]["id"],
                "codigo": prod_docs["PRD-007"]["codigo"],
                "nombre": prod_docs["PRD-007"]["nombre"],
                "cant_solicitada": 50,
                "cant_confirmada": 50,
                "cant_recibida": 40,
                "recibido": True,
                "motivo": "faltante: 10 cajas pendientes por retraso del transportista"
            },
            {
                "producto_id": prod_docs["PRD-008"]["id"],
                "codigo": prod_docs["PRD-008"]["codigo"],
                "nombre": prod_docs["PRD-008"]["nombre"],
                "cant_solicitada": 30,
                "cant_confirmada": 30,
                "cant_recibida": 30,
                "recibido": True,
                "motivo": None
            }
        ],
        "motivo_rechazo_cancelacion": None,
        "creado_en": now - timedelta(days=2),
        "actualizado_en": now - timedelta(hours=3)
    }
    r4 = await db.solicitudes.insert_one(s4)
    await db.movimientos.insert_one({
        "tipo": MovementType.INGRESO_INVENTARIO,
        "solicitud_id": str(r4.inserted_id),
        "numero_solicitud": s4["numero"],
        "proveedor_id": s4["proveedor_id"],
        "proveedor_nombre": "Logística y Suministros Global",
        "producto_id": prod_docs["PRD-007"]["id"],
        "codigo_producto": prod_docs["PRD-007"]["codigo"],
        "nombre_producto": prod_docs["PRD-007"]["nombre"],
        "cantidad": 40,
        "usuario_id": user_ids["bodega@sistema.com"],
        "usuario_nombre": "Operador de Bodega",
        "comentario": "Recepción parcial en bodega",
        "fecha": now - timedelta(hours=3)
    })
    await db.movimientos.insert_one({
        "tipo": MovementType.ESTADO_CAMBIADO,
        "solicitud_id": str(r4.inserted_id),
        "numero_solicitud": s4["numero"],
        "proveedor_id": s4["proveedor_id"],
        "proveedor_nombre": "Logística y Suministros Global",
        "estado_anterior": "Por entregar",
        "estado_nuevo": "Entregada parcial",
        "usuario_id": user_ids["bodega@sistema.com"],
        "usuario_nombre": "Operador de Bodega",
        "comentario": "Recepción con faltantes registrada",
        "fecha": now - timedelta(hours=3)
    })

    # S5: Entregada (completamente recibida)
    s5 = {
        "numero": "SOL-2026-000005",
        "proveedor_id": prov_ids["PRV-001"],
        "fecha_entrega": (hoy - timedelta(days=1)).isoformat(),
        "estado": "Entregada",
        "observaciones": "Entrega completada a conformidad de cartuchos de tóner.",
        "creado_por": user_ids["compras@sistema.com"],
        "lineas": [
            {
                "producto_id": prod_docs["PRD-009"]["id"],
                "codigo": prod_docs["PRD-009"]["codigo"],
                "nombre": prod_docs["PRD-009"]["nombre"],
                "cant_solicitada": 10,
                "cant_confirmada": 10,
                "cant_recibida": 10,
                "recibido": True,
                "motivo": None
            },
            {
                "producto_id": prod_docs["PRD-010"]["id"],
                "codigo": prod_docs["PRD-010"]["codigo"],
                "nombre": prod_docs["PRD-010"]["nombre"],
                "cant_solicitada": 5,
                "cant_confirmada": 5,
                "cant_recibida": 5,
                "recibido": True,
                "motivo": None
            }
        ],
        "motivo_rechazo_cancelacion": None,
        "creado_en": now - timedelta(days=3),
        "actualizado_en": now - timedelta(days=1)
    }
    r5 = await db.solicitudes.insert_one(s5)
    await db.movimientos.insert_one({
        "tipo": MovementType.INGRESO_INVENTARIO,
        "solicitud_id": str(r5.inserted_id),
        "numero_solicitud": s5["numero"],
        "proveedor_id": s5["proveedor_id"],
        "proveedor_nombre": "Distribuidora Central S.A.",
        "producto_id": prod_docs["PRD-010"]["id"],
        "codigo_producto": prod_docs["PRD-010"]["codigo"],
        "nombre_producto": prod_docs["PRD-010"]["nombre"],
        "cantidad": 5,
        "usuario_id": user_ids["bodega@sistema.com"],
        "usuario_nombre": "Operador de Bodega",
        "comentario": "Recepción completa en bodega",
        "fecha": now - timedelta(days=1)
    })
    await db.movimientos.insert_one({
        "tipo": MovementType.ESTADO_CAMBIADO,
        "solicitud_id": str(r5.inserted_id),
        "numero_solicitud": s5["numero"],
        "proveedor_id": s5["proveedor_id"],
        "proveedor_nombre": "Distribuidora Central S.A.",
        "estado_anterior": "Por entregar",
        "estado_nuevo": "Entregada",
        "usuario_id": user_ids["bodega@sistema.com"],
        "usuario_nombre": "Operador de Bodega",
        "comentario": "Todo lo confirmado recibido conforme",
        "fecha": now - timedelta(days=1)
    })

    # Bitácora de seguridad inicial
    await db.bitacora_seguridad.insert_one({
        "evento": "SYSTEM_INIT",
        "usuario_id": user_ids["admin@sistema.com"],
        "email": "admin@sistema.com",
        "ip": "127.0.0.1",
        "dispositivo_id": "seed-device",
        "exito": True,
        "detalle": "Inicialización y carga de datos de ejemplo completada",
        "fecha": now
    })

    print("✅ Base de datos sembrada con éxito: 5 roles, 5 usuarios, 3 proveedores, 10 productos y 5 solicitudes.")
