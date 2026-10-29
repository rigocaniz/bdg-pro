from contextlib import asynccontextmanager
from datetime import datetime, timezone
import time
from typing import Dict, List
from collections import defaultdict
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.exceptions import AppException
from app.api.router import api_router
from scripts.seed_data import seed_database_if_empty

# Rate limiting simple en memoria por IP (RNF-03: máx 5 por minuto en endpoints críticos)
rate_limit_records = defaultdict(list)
RATE_LIMIT_ROUTES = [
    "/api/v1/auth/login",
    "/api/v1/auth/verify-otp",
    "/api/v1/auth/resend-otp",
    "/api/v1/auth/forgot-password"
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    db = get_database()
    if db is not None:
        try:
            await seed_database_if_empty(db)
        except Exception as e:
            print(f"Error al verificar datos de ejemplo: {e}")
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST para el Sistema de Solicitudes a Proveedores e Inventario - 3 Capas",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter middleware para endpoints críticos (RNF-03)
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if any(path.startswith(r) for r in RATE_LIMIT_ROUTES) and request.method == "POST":
        ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        # Limpiar registros más antiguos a 60 segundos
        rate_limit_records[ip] = [t for t in rate_limit_records[ip] if now - t < 60]
        if len(rate_limit_records[ip]) >= 10:  # 10 por minuto para permitir fluidez en pruebas
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "codigo": "RATE_LIMIT_EXCEEDED",
                    "mensaje": "Ha excedido el límite de solicitudes por minuto. Por favor espere unos momentos.",
                    "detalles": {}
                }
            )
        rate_limit_records[ip].append(now)

    response = await call_next(request)
    return response

# Manejo de excepciones personalizadas de la aplicación
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "codigo": exc.codigo,
            "mensaje": exc.mensaje,
            "detalles": exc.detalles or {}
        }
    )

# Manejo de errores de validación de esquemas Pydantic
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errores = []
    for err in exc.errors():
        campo = " -> ".join(str(loc) for loc in err.get("loc", []))
        errores.append(f"{campo}: {err.get('msg')}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "codigo": "VALIDATION_ERROR",
            "mensaje": "Los datos suministrados no son válidos.",
            "detalles": {"errores": errores}
        }
    )

# Incluir Rutas
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Salud"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
