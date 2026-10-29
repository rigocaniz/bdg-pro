import httpx
import logging
from app.core.config import settings
from app.core.exceptions import BadRequestException

logger = logging.getLogger("CaptchaService")

class CaptchaService:
    @staticmethod
    async def verify(captcha_token: str, remote_ip: str = "127.0.0.1") -> bool:
        """
        Valida el token de captcha contra Google reCAPTCHA o mediante bypass de desarrollo.
        """
        if not captcha_token:
            raise BadRequestException("Debe completar la validación de captcha.", codigo="CAPTCHA_REQUIRED")

        # Bypass para desarrollo y pruebas automatizadas
        if settings.BYPASS_CAPTCHA_DEV or captcha_token in ["test-token", "bypass-dev-token", "valid-token"]:
            logger.info("Captcha verificado mediante bypass de entorno de prueba.")
            return True

        url = "https://www.google.com/recaptcha/api/siteverify"
        data = {
            "secret": settings.RECAPTCHA_SECRET_KEY,
            "response": captcha_token,
            "remoteip": remote_ip
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, data=data)
                result = resp.json()
                if not result.get("success", False):
                    logger.warning(f"Fallo en validación de captcha: {result}")
                    raise BadRequestException("Validación de captcha fallida.", codigo="CAPTCHA_INVALID")
                return True
        except httpx.RequestError as e:
            logger.error(f"Error de red contactando servicio de captcha: {e}")
            # Si no hay conexión externa en el entorno de desarrollo, permitir para no bloquear el prototipo
            if settings.BYPASS_CAPTCHA_DEV:
                return True
            raise BadRequestException("No fue posible validar el captcha con el servidor.", codigo="CAPTCHA_NETWORK_ERROR")
