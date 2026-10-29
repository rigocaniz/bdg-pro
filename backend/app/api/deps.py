from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Callable
from fastapi import Depends, Header, Cookie, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_database, db_instance
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException

security_bearer = HTTPBearer(auto_error=False)

class CurrentUser:
    def __init__(
        self,
        id: str,
        nombre: str,
        email: str,
        roles: List[str],
        permisos: List[str],
        proveedor_id: Optional[str],
        session_id: str,
        raw_user: Dict[str, Any]
    ):
        self.id = id
        self.nombre = nombre
        self.email = email
        self.roles = roles
        self.permisos = permisos
        self.proveedor_id = proveedor_id
        self.session_id = session_id
        self.raw_user = raw_user

    def has_role(self, role: str) -> bool:
        return "Administrador" in self.roles or role in self.roles

    def has_permission(self, permiso: str) -> bool:
        return "Administrador" in self.roles or permiso in self.permisos

def get_client_ip(request: Request) -> str:
    """Extrae la IP real del cliente."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def get_device_id(
    request: Request,
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    dispositivo_cookie: Optional[str] = Cookie(None, alias="dispositivo_id")
) -> str:
    """Extrae el identificador de dispositivo desde encabezado o cookie."""
    if x_device_id:
        return x_device_id
    if dispositivo_cookie:
        return dispositivo_cookie
    return "dev-browser-default"

async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncIOMotorDatabase = Depends(get_database),
    device_id: str = Depends(get_device_id)
) -> CurrentUser:
    """
    Valida token JWT, comprueba vigencia de sesión única y control de inactividad de 30 min (RF-SEG-06).
    """
    if not auth:
        raise UnauthorizedException("Credenciales no suministradas", codigo="NO_CREDENTIALS")

    token = auth.credentials
    payload = decode_token(token)

    user_id = payload.get("sub")
    session_id = payload.get("session_id")

    if not user_id or not session_id:
        raise UnauthorizedException("Token inválido", codigo="INVALID_TOKEN_CLAIMS")

    # 1. Validar en base de datos la sesión (RF-SEG-06)
    try:
        sesion = await db.sesiones.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise UnauthorizedException("Sesión inexistente", codigo="SESSION_NOT_FOUND")

    if not sesion or not sesion.get("activa", False):
        raise UnauthorizedException(
            "Su sesión fue cerrada porque se inició en otro equipo o fue finalizada.",
            codigo="SESSION_INVALIDATED"
        )

    # 2. Control de inactividad de 30 minutos (RF-SEG-06)
    now = datetime.now(timezone.utc)
    ultimo_acceso = sesion.get("ultimo_acceso", now)
    if ultimo_acceso.tzinfo is None:
        ultimo_acceso = ultimo_acceso.replace(tzinfo=timezone.utc)

    if (now - ultimo_acceso).total_seconds() > settings.INACTIVITY_TIMEOUT_MINUTES * 60:
        await db.sesiones.update_one(
            {"_id": sesion["_id"]},
            {"$set": {"activa": False}}
        )
        raise UnauthorizedException(
            "Su sesión fue cerrada automáticamente por inactividad (30 minutos).",
            codigo="SESSION_TIMEOUT"
        )

    # Actualizar último acceso para prolongar la sesión activa
    await db.sesiones.update_one(
        {"_id": sesion["_id"]},
        {"$set": {"ultimo_acceso": now}}
    )

    # 3. Validar estado del usuario
    try:
        user = await db.usuarios.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise UnauthorizedException("Usuario no encontrado", codigo="USER_NOT_FOUND")

    if not user:
        raise UnauthorizedException("Usuario no encontrado", codigo="USER_NOT_FOUND")

    if user.get("estado") != "activo":
        raise UnauthorizedException("La cuenta del usuario no está activa", codigo="USER_INACTIVE")

    # Roles y permisos consolidados
    user_roles = user.get("roles", ["Consulta"])
    roles_cursor = db.roles.find({"nombre": {"$in": user_roles}})
    roles_list = await roles_cursor.to_list(length=100)
    permisos_set = set()
    for r in roles_list:
        for p in r.get("permisos", []):
            permisos_set.add(p)

    return CurrentUser(
        id=user_id,
        nombre=user["nombre"],
        email=user["email"],
        roles=user_roles,
        permisos=list(permisos_set),
        proveedor_id=user.get("proveedor_id"),
        session_id=session_id,
        raw_user=user
    )

def require_permission(permiso: str) -> Callable:
    """Dependency factory que verifica que el usuario cuente con un permiso específico."""
    async def permission_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.has_permission(permiso):
            raise ForbiddenException(
                f"No tiene el permiso requerido: '{permiso}'.",
                codigo="PERMISSION_DENIED"
            )
        return current_user
    return permission_checker

def require_role(rol: str) -> Callable:
    """Dependency factory que verifica que el usuario tenga un rol específico o Administrador."""
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.has_role(rol):
            raise ForbiddenException(
                f"Se requiere el rol '{rol}' para acceder a este recurso.",
                codigo="ROLE_DENIED"
            )
        return current_user
    return role_checker
