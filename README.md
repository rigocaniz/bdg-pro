# Sistema de Solicitudes a Proveedores e Inventario (BDG PRO)

Prototipo funcional de aplicación web de tres capas para gestionar solicitudes de productos a proveedores, confirmación de entregas, recepción en bodega e inventario resultante con estricto control de seguridad, 2FA y sesión única.

---

## 1. Arquitectura y Stack Tecnológico

La solución está construida en una arquitectura desacoplada de 3 capas:

* **Frontend (SPA):** React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons y Axios.
* **Backend (API REST):** Python 3.12 / FastAPI, Pydantic v2, Motor (driver asíncrono para MongoDB), PyJWT y passlib (bcrypt).
* **Base de Datos:** MongoDB 7 configurado en **Replica Set (`rs0`)**, habilitando transacciones atómicas multi-documento para la recepción de entregas e inventario, índices únicos parciales y TTL.
* **Servicios Externos (Simulados / Integrados):**
  * **reCAPTCHA:** Google reCAPTCHA v2 (claves oficiales de prueba de Google y modo de bypass para desarrollo).
  * **Notificaciones y OTP:** Servicio de correo simulado en consola (muestra de manera visible los códigos OTP de 6 dígitos y enlaces de activación/recuperación).

---

## 2. Estructura del Proyecto

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py          # RF-SEG-01, 02, 03, 04, 06 (Login 2FA, OTP, Registro, Password)
│   │   │   │   ├── users.py         # RF-SEG-05 (Gestión de usuarios y roles)
│   │   │   │   ├── products.py      # RF-NEG-01, 06 (Catálogo de productos)
│   │   │   │   ├── suppliers.py     # RF-NEG-01 (Catálogo de proveedores)
│   │   │   │   ├── requests.py      # RF-NEG-02, 03, 04 (Ciclo de solicitudes)
│   │   │   │   ├── inventory.py     # RF-NEG-05 (Consulta de inventario y exportación CSV)
│   │   │   │   ├── movements.py     # RF-NEG-07 (3 pestañas: pedidos, ingresos, cambios)
│   │   │   │   ├── audit.py         # RF-SEG-07 (Bitácora de seguridad)
│   │   │   │   └── dashboard.py     # Métricas y tarjetas del panel de inicio
│   │   │   ├── deps.py              # Validación de sesión única, JWT, inactividad y permisos
│   │   │   └── router.py            # Enrutador principal /api/v1
│   │   ├── core/
│   │   │   ├── config.py            # Configuraciones y variables de entorno
│   │   │   ├── database.py          # Conexión asíncrona a MongoDB e índices de la Sección 7
│   │   │   ├── security.py          # Hashing, políticas de contraseña, OTP y JWT
│   │   │   ├── state_machine.py     # Máquina de estados de la Sección 6 (rechaza con HTTP 409)
│   │   │   └── exceptions.py        # Manejador centralizado de errores con {codigo, mensaje, detalles}
│   │   ├── models/                  # Esquemas Pydantic y modelos DB
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── verification_token.py
│   │   │   ├── product.py
│   │   │   ├── supplier.py
│   │   │   ├── request.py
│   │   │   ├── inventory.py
│   │   │   ├── movement.py
│   │   │   ├── security_audit.py
│   │   │   └── common.py
│   │   ├── services/                # Lógica de negocio por capas
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── request_service.py
│   │   │   ├── inventory_service.py # Transacciones atómicas de inventario
│   │   │   ├── movement_service.py
│   │   │   ├── email_service.py
│   │   │   └── captcha_service.py
│   │   └── main.py                  # Servidor FastAPI, middleware de rate limiting y lifespan
│   ├── scripts/
│   │   └── seed_data.py             # Script de datos iniciales y de prueba
│   ├── tests/
│   │   └── test_api.py              # Pruebas unitarias de seguridad y máquina de estados
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Contenedor con Sidebar y Navbar
│   │   │   ├── Navbar.jsx           # Perfil, rol, equipo y cerrar sesión
│   │   │   ├── Sidebar.jsx          # Menú de navegación según permisos de rol
│   │   │   ├── ProtectedRoute.jsx   # Protección de rutas por permiso o rol
│   │   │   ├── CaptchaWidget.jsx    # Componente reCAPTCHA interactivo
│   │   │   ├── StatusBadge.jsx      # Etiquetas con colores consistentes de estados
│   │   │   └── Toast.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Autenticación, 2FA, sesión única y control de expiración
│   │   │   └── ToastContext.jsx     # Notificaciones tipo toast en tiempo real
│   │   ├── pages/                   # Las 16 Pantallas de la Sección 9 en español
│   │   │   ├── P01Login.jsx
│   │   │   ├── P02VerifyOtp.jsx
│   │   │   ├── P03ActiveSessionNotice.jsx
│   │   │   ├── P04Register.jsx
│   │   │   ├── P05ForgotPassword.jsx
│   │   │   ├── P06ResetPassword.jsx
│   │   │   ├── P07Dashboard.jsx
│   │   │   ├── P08UsersRoles.jsx
│   │   │   ├── P09Products.jsx
│   │   │   ├── P10Suppliers.jsx
│   │   │   ├── P11RequestsList.jsx
│   │   │   ├── P12NewEditRequest.jsx
│   │   │   ├── P13ConfirmRequest.jsx
│   │   │   ├── P14ReceiveDelivery.jsx
│   │   │   ├── P15Inventory.jsx
│   │   │   ├── P16Movements.jsx
│   │   │   ├── SecurityAudit.jsx    # Bitácora de seguridad
│   │   │   ├── RequestDetail.jsx    # Vista general de la solicitud
│   │   │   └── VerifyEmail.jsx      # Enlace de verificación de correo
│   │   ├── services/
│   │   │   ├── api.js               # Cliente Axios e interceptor 401 de sesión invalidada
│   │   │   └── device.js            # Identificador de dispositivo persistente UUID (RF-SEG-06)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── mongo-init/
│   └── rs-init.sh                   # Inicialización automática del Replica Set rs0 en MongoDB
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 3. Despliegue con Docker Compose (Recomendado)

El proyecto incluye configuración completa de Docker con inicialización de replica set de MongoDB:

```bash
# 1. Clonar o ubicarse en la raíz del proyecto
cd "d:\LABS\BDG PRO"

# 2. Levantar todos los contenedores en segundo plano
docker compose up -d --build

# 3. Observar los logs del backend (donde se imprimen los OTP y correos simulados)
docker compose logs -f backend
```

Servicios levantados:
* **Frontend Web:** [http://localhost:5173](http://localhost:5173)
* **Backend API REST:** [http://localhost:8000](http://localhost:8000)
* **Documentación Interactiva Swagger / OpenAPI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Base de Datos MongoDB (Replica Set rs0):** `mongodb://localhost:27017`

---

## 4. Usuarios y Credenciales de Ejemplo Precargados

La base de datos se siembra automáticamente al iniciar el backend si se encuentra vacía, con **un usuario por cada rol**:

| Rol | Correo Electrónico | Contraseña | Proveedor Vinculado | Permisos Principales |
|---|---|---|---|---|
| **Administrador** | `admin@sistema.com` | `Admin123!` | Ninguno (Acceso Total) | Gestionar usuarios, roles, bitácora de seguridad y todos los permisos |
| **Compras** | `compras@sistema.com` | `Admin123!` | Ninguno | Crear/editar solicitudes, enviar al proveedor, cancelar, catálogo productos/proveedores |
| **Proveedor** | `proveedor@sistema.com` | `Admin123!` | Proveeduría Industrial S.A. | Confirmar o rechazar solicitudes dirigidas a su empresa, ver sus movimientos |
| **Bodega** | `bodega@sistema.com` | `Admin123!` | Ninguno | Registrar recepción física de entregas, alimentar inventario, consultar inventario |
| **Consulta** | `consulta@sistema.com` | `Admin123!` | Ninguno | Solo lectura de inventario, catálogo de productos y movimientos |

---

## 5. Datos de Ejemplo Precargados

* **10 Productos:**
  * `PRD-001`: Papel Bond Carta 75g (Resma) — Stock: 80
  * `PRD-002`: Bolígrafo Gel Azul 0.7mm (Caja x 12) — Stock: 45
  * `PRD-003`: Marcador Permanente Negro (Caja x 10) — Stock: 10 (Alerta stock bajo)
  * `PRD-004`: Cinta Adhesiva de Embalaje 48mm x 100m (Rollo) — Stock: 30
  * `PRD-005`: Tijera de Acero Inoxidable 8" (Unidad) — Stock: 12 (Alerta stock bajo)
  * `PRD-006`: Engrapadora Metálica de Escritorio (Unidad) — Stock: 25
  * `PRD-007`: Grapas Estándar 26/6 (Caja x 5000) — Stock: 60
  * `PRD-008`: Folder Manila Tamaño Carta (Paquete x 50) — Stock: 8 (Alerta stock bajo)
  * `PRD-009`: Sobres Manila Tamaño Oficio (Paquete x 25) — Stock: 15 (Alerta stock bajo)
  * `PRD-010`: Tóner Láser Negro Alto Rendimiento (Cartucho) — Stock: 5 (Alerta stock bajo)

* **3 Proveedores:**
  * `PRV-001`: Distribuidora Central S.A. (NIT: 1029384-5)
  * `PRV-002`: Proveeduría Industrial S.A. (NIT: 9876543-2)
  * `PRV-003`: Logística y Suministros Global (NIT: 5544332-1)

* **5 Solicitudes en estados distintos con su trazabilidad:**
  1. `SOL-2026-000001`: Estado **Borrador** (editable por Compras).
  2. `SOL-2026-000002`: Estado **Enviada** (esperando respuesta de `proveedor@sistema.com`).
  3. `SOL-2026-000003`: Estado **Por entregar** (confirmada parcialmente por el proveedor, con badge visual).
  4. `SOL-2026-000004`: Estado **Entregada parcial** (recibida en bodega con faltante justificado).
  5. `SOL-2026-000005`: Estado **Entregada** (completamente recibida, reflejada en inventario).

---

## 6. Funcionalidades y Cumplimiento de Requerimientos

### Seguridad (Sección 4)
* **RF-SEG-01 Registro de usuarios:** Formulario público con validación de fortaleza de contraseña, captcha, envío de correo de activación y activación en estado `activo` con rol `Consulta`.
* **RF-SEG-02 Doble Factor (2FA):**
  * **Paso 1:** Validación de credenciales + Captcha + Dispositivo. Bloqueo automático por 15 minutos tras 5 intentos fallidos de contraseña sin revelar existencia de cuenta. Emisión de ticket temporal de 5 minutos y envío de código OTP de 6 dígitos.
  * **Paso 2:** Validación de OTP de un solo uso (máximo 3 intentos). Reenvío con cuenta regresiva obligatoria de 60 segundos. Emisión de tokens de sesión JWT.
* **RF-SEG-03 Captcha:** Validación estricta en backend en login, registro y recuperación de contraseña.
* **RF-SEG-04 Recuperación de Contraseña:** Enlace con token de un solo uso (vigencia 30 minutos). Validación de no reutilizar las últimas 3 contraseñas e invalidación inmediata de todas las sesiones activas del usuario.
* **RF-SEG-05 Gestión de Usuarios:** Panel para el Administrador para activar, desactivar, desbloquear, asignar roles y forzar el cierre de sesión única.
* **RF-SEG-06 Sesión Única:**
  * Solo una sesión activa por usuario en todo el sistema. Si inicia en otro lugar, la pantalla P03 le advierte y, al confirmar, la sesión previa se invalida en base de datos.
  * Solo una sesión activa por equipo (`dispositivo_id` guardado en cookie y cabeceras).
  * Expiración automática por inactividad a los 30 minutos.
  * En cada petición el backend valida que la sesión siga activa; si fue invalidada, retorna HTTP 401 y el frontend redirige automáticamente con el mensaje *"Su sesión fue cerrada porque se inició en otro equipo"*.
* **RF-SEG-07 Bitácora de Seguridad:** Auditoría inmutable de inicios de sesión, envíos de OTP, bloqueos, cambios de roles y cierres forzados con fecha, IP y dispositivo.

### Negocio y Máquina de Estados (Secciones 5 y 6)
* **Máquina de Estados de la Solicitud:** Valida rigurosamente las transiciones permitidas y rechaza cualquier salto inválido con código **HTTP 409 Conflict**.
* **Recepción Atómica en Bodega:** La actualización de las líneas de la solicitud, el incremento en inventario (`$inc`) y el registro de movimientos se realizan dentro de una transacción en MongoDB Replica Set.
* **Consulta de Movimientos (RF-NEG-07):** Tres pestañas en el orden estricto solicitado:
  1. **Pedidos:** resumen de número, proveedor, fechas, estado y total de líneas con modal de detalle.
  2. **Productos ingresados:** fecha de recepción, solicitud, producto, cantidad ingresada y usuario receptor.
  3. **Cambios desde pedido hasta entrega:** línea de tiempo cronológica con cada cambio de estado, cantidades y comentarios.

---

## 7. Ejecución de Pruebas Unitarias

Para ejecutar la suite de pruebas unitarias de seguridad y máquina de estados:

```bash
# Dentro del backend
python -m unittest backend/tests/test_api.py
```
Resultado:
```
Ran 5 tests in 0.003s
OK
```

---

## 8. Verificación de Códigos OTP en Desarrollo

Al tener `SIMULATE_EMAIL=true`, todos los códigos OTP y enlaces generados por el sistema se muestran en la consola del backend con un encabezado visible:

```
================================================================================
🔐 [CORREO SIMULADO] CÓDIGO DE SEGURIDAD (OTP - 2FA)
Para: admin@sistema.com
Asunto: Tu código de verificación de 6 dígitos
Tu código OTP es:  >>> 849201 <<<
Vigencia: 5 minutos. De un solo uso.
================================================================================
```
Basta con copiar este número de 6 dígitos e ingresarlo en la pantalla P02 para acceder.
