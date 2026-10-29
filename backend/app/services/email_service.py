import logging
from app.core.config import settings

logger = logging.getLogger("EmailService")

class EmailService:
    @staticmethod
    def send_verification_email(email: str, token: str):
        url = f"http://localhost:5173/verificar-email?token={token}"
        msg = f"""
================================================================================
📧 [CORREO SIMULADO] VERIFICACIÓN DE CUENTA
Para: {email}
Asunto: Verifica tu cuenta - Sistema de Solicitudes a Proveedores
Enlace de activación: {url}
Token de activación: {token}
================================================================================
"""
        logger.info(msg)
        print(msg)

    @staticmethod
    def send_otp_email(email: str, otp: str):
        msg = f"""
================================================================================
🔐 [CORREO SIMULADO] CÓDIGO DE SEGURIDAD (OTP - 2FA)
Para: {email}
Asunto: Tu código de verificación de 6 dígitos
Tu código OTP es:  >>> {otp} <<<
Vigencia: {settings.OTP_EXPIRE_MINUTES} minutos. De un solo uso.
================================================================================
"""
        logger.info(msg)
        print(msg)

    @staticmethod
    def send_password_reset_email(email: str, token: str):
        url = f"http://localhost:5173/nueva-contrasena?token={token}"
        msg = f"""
================================================================================
🔑 [CORREO SIMULADO] RECUPERACIÓN DE CONTRASEÑA
Para: {email}
Asunto: Solicitud de cambio de contraseña
Enlace para restablecer contraseña: {url}
Token: {token}
Vigencia: {settings.RESET_TOKEN_EXPIRE_MINUTES} minutos.
================================================================================
"""
        logger.info(msg)
        print(msg)

    @staticmethod
    def send_notification(email: str, asunto: str, mensaje: str):
        msg = f"""
================================================================================
📢 [CORREO SIMULADO] NOTIFICACIÓN DE SISTEMA
Para: {email}
Asunto: {asunto}
Mensaje: {mensaje}
================================================================================
"""
        logger.info(msg)
        print(msg)
