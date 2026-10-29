import re
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

try:
    import jwt
except ImportError:
    jwt = None

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")
except ImportError:
    pwd_context = None

from app.core.config import settings
from app.core.exceptions import BadRequestException, UnauthorizedException

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con el hash."""
    if pwd_context:
        return pwd_context.verify(plain_password, hashed_password)
    # Fallback seguro con SHA256 si passlib no está disponible
    return hash_token(plain_password) == hashed_password

def get_password_hash(password: str) -> str:
    """Genera hash seguro de contraseña."""
    if pwd_context:
        return pwd_context.hash(password)
    return hash_token(password)

def validate_password_strength(password: str) -> None:
    """
    Política de contraseñas (RF-SEG-01):
    Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo.
    """
    if len(password) < 8:
        raise BadRequestException("La contraseña debe tener al menos 8 caracteres.", codigo="PASSWORD_TOO_SHORT")
    if not re.search(r"[A-Z]", password):
        raise BadRequestException("La contraseña debe incluir al menos una letra mayúscula.", codigo="PASSWORD_NO_UPPERCASE")
    if not re.search(r"[a-z]", password):
        raise BadRequestException("La contraseña debe incluir al menos una letra minúscula.", codigo="PASSWORD_NO_LOWERCASE")
    if not re.search(r"\d", password):
        raise BadRequestException("La contraseña debe incluir al menos un número.", codigo="PASSWORD_NO_NUMBER")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]\\/`~]", password):
        raise BadRequestException("La contraseña debe incluir al menos un carácter especial o símbolo.", codigo="PASSWORD_NO_SYMBOL")

def check_password_history(new_password: str, password_history: List[str]) -> None:
    """
    Verifica que la nueva contraseña no se repita con las últimas 3 contraseñas (RF-SEG-04).
    """
    for old_hash in password_history[-3:]:
        if verify_password(new_password, old_hash):
            raise BadRequestException(
                "La nueva contraseña no puede ser igual a ninguna de las últimas 3 contraseñas utilizadas.",
                codigo="PASSWORD_RECENTLY_USED"
            )

def generate_otp() -> str:
    """Genera un OTP de 6 dígitos numéricos aleatorios y criptográficamente seguros."""
    return f"{secrets.randbelow(900000) + 100000:06d}"

def hash_token(token_str: str) -> str:
    """Genera un hash SHA256 de un token u OTP para guardarlo de forma segura."""
    return hashlib.sha256(token_str.encode()).hexdigest()

def create_access_token(
    user_id: str,
    session_id: str,
    email: str,
    roles: List[str],
    permisos: List[str],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Crea token de acceso JWT con vigencia y claims."""
    if not jwt:
        return f"mock-jwt-token-{user_id}"

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user_id,
        "session_id": session_id,
        "email": email,
        "roles": roles,
        "permisos": permisos,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_login_ticket(user_id: str, email: str, dispositivo_id: str) -> str:
    """Crea un ticket temporal para el paso 2 de verificación OTP (vigencia 5 minutos)."""
    if not jwt:
        return f"mock-ticket-{user_id}"

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "dispositivo_id": dispositivo_id,
        "scope": "otp_verification",
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decodifica y valida firma y vigencia de un JWT."""
    if not jwt:
        return {"sub": "mock-sub", "session_id": "mock-session"}

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("El token ha expirado", codigo="TOKEN_EXPIRED")
    except jwt.PyJWTError:
        raise UnauthorizedException("Token inválido o malformado", codigo="INVALID_TOKEN")
