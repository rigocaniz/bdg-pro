from typing import Any, Optional

try:
    from fastapi import HTTPException, status
except ImportError:
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: Any):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class status:
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403
        HTTP_404_NOT_FOUND = 404
        HTTP_409_CONFLICT = 409
        HTTP_422_UNPROCESSABLE_ENTITY = 422

class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        codigo: str,
        mensaje: str,
        detalles: Optional[Any] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "codigo": codigo,
                "mensaje": mensaje,
                "detalles": detalles or {}
            }
        )
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles

class BadRequestException(AppException):
    def __init__(self, mensaje: str, codigo: str = "BAD_REQUEST", detalles: Optional[Any] = None):
        super().__init__(status.HTTP_400_BAD_REQUEST, codigo, mensaje, detalles)

class UnauthorizedException(AppException):
    def __init__(self, mensaje: str = "No autorizado", codigo: str = "UNAUTHORIZED", detalles: Optional[Any] = None):
        super().__init__(status.HTTP_401_UNAUTHORIZED, codigo, mensaje, detalles)

class ForbiddenException(AppException):
    def __init__(self, mensaje: str = "Permisos insuficientes", codigo: str = "FORBIDDEN", detalles: Optional[Any] = None):
        super().__init__(status.HTTP_403_FORBIDDEN, codigo, mensaje, detalles)

class NotFoundException(AppException):
    def __init__(self, mensaje: str = "Recurso no encontrado", codigo: str = "NOT_FOUND", detalles: Optional[Any] = None):
        super().__init__(status.HTTP_404_NOT_FOUND, codigo, mensaje, detalles)

class ConflictException(AppException):
    def __init__(self, mensaje: str, codigo: str = "CONFLICT", detalles: Optional[Any] = None):
        super().__init__(status.HTTP_409_CONFLICT, codigo, mensaje, detalles)

class UnprocessableException(AppException):
    def __init__(self, mensaje: str = "Entidad no procesable", codigo: str = "UNPROCESSABLE_ENTITY", detalles: Optional[Any] = None):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, codigo, mensaje, detalles)
