from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    NotFoundException
)
from app.core.security import (
    get_password_hash,
    verify_password,
    validate_password_strength,
    check_password_history,
    generate_otp,
    hash_token,
    create_access_token,
    create_login_ticket,
    decode_token
)
from app.models.verification_token import TokenType
from app.services.email_service import EmailService
from app.services.captcha_service import CaptchaService

class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def _log_security(
        self,
        evento: str,
        email: str,
        ip: str,
        dispositivo_id: Optional[str],
        exito: bool,
        detalle: str = "",
        usuario_id: Optional[str] = None
    ):
        await self.db.bitacora_seguridad.insert_one({
            "evento": evento,
            "usuario_id": usuario_id,
            "email": email,
            "ip": ip,
            "dispositivo_id": dispositivo_id,
            "exito": exito,
            "detalle": detalle,
            "fecha": datetime.now(timezone.utc)
        })

    async def register(self, data, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """RF-SEG-01 Registro de usuarios."""
        await CaptchaService.verify(data.captcha_token, ip)

        if data.password != data.confirm_password:
            raise BadRequestException("Las contraseñas no coinciden.", codigo="PASSWORDS_DO_NOT_MATCH")

        validate_password_strength(data.password)

        existing = await self.db.usuarios.find_one({"email": data.email.lower()})
        if existing:
            raise ConflictException("El correo electrónico ya está registrado.", codigo="EMAIL_ALREADY_EXISTS")

        pwd_hash = get_password_hash(data.password)
        now = datetime.now(timezone.utc)

        user_doc = {
            "nombre": data.nombre.strip(),
            "email": data.email.lower(),
            "password_hash": pwd_hash,
            "roles": ["Consulta"],
            "proveedor_id": None,
            "estado": "pendiente",
            "intentos_fallidos": 0,
            "bloqueado_hasta": None,
            "historial_passwords": [pwd_hash],
            "creado_en": now
        }
        res = await self.db.usuarios.insert_one(user_doc)
        user_id = str(res.inserted_id)

        # Generar token de verificación de correo
        verify_token = generate_otp() + generate_otp()  # 12 caracteres
        token_hash = hash_token(verify_token)
        expira_en = now + timedelta(hours=settings.VERIFY_EMAIL_EXPIRE_HOURS)

        await self.db.tokens_verificacion.insert_one({
            "usuario_id": user_id,
            "tipo": TokenType.VERIFICAR_EMAIL,
            "codigo_hash": token_hash,
            "intentos": 0,
            "expira_en": expira_en,
            "usado": False,
            "creado_en": now
        })

        EmailService.send_verification_email(data.email.lower(), verify_token)
        await self._log_security("REGISTER", data.email.lower(), ip, None, True, "Registro exitoso, pendiente de verificación", user_id)

        return {
            "mensaje": "Usuario registrado exitosamente. Se ha enviado un correo con el enlace de verificación.",
            "usuario_id": user_id
        }

    async def verify_email(self, token: str, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Verifica la cuenta del usuario mediante token."""
        token_hash = hash_token(token)
        now = datetime.now(timezone.utc)

        rec = await self.db.tokens_verificacion.find_one({
            "tipo": TokenType.VERIFICAR_EMAIL,
            "codigo_hash": token_hash,
            "usado": False,
            "expira_en": {"$gt": now}
        })
        if not rec:
            raise BadRequestException("Token de verificación inválido o expirado.", codigo="INVALID_TOKEN")

        user_id = rec["usuario_id"]
        await self.db.usuarios.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"estado": "activo"}}
        )
        await self.db.tokens_verificacion.update_one(
            {"_id": rec["_id"]},
            {"$set": {"usado": True}}
        )

        user = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        await self._log_security("VERIFY_EMAIL", user["email"], ip, None, True, "Cuenta activada con rol Consulta", user_id)

        return {"mensaje": "Cuenta verificada con éxito. Ya puede iniciar sesión."}

    async def login_step1(self, data, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """
        RF-SEG-02: Paso 1 de inicio de sesión.
        Valida credenciales, captcha, dispositivo, y envía OTP.
        """
        await CaptchaService.verify(data.captcha_token, ip)

        now = datetime.now(timezone.utc)
        user = await self.db.usuarios.find_one({"email": data.email.lower()})

        # Regla: Mensajes de error no revelan si el correo existe
        generic_error = "Credenciales inválidas o cuenta no disponible."

        if not user:
            await self._log_security("LOGIN_FAILED", data.email.lower(), ip, data.dispositivo_id, False, "Usuario inexistente")
            raise UnauthorizedException(generic_error, codigo="INVALID_CREDENTIALS")

        user_id = str(user["_id"])

        # Verificar bloqueo temporal por 5 intentos fallidos
        bloqueado_hasta = user.get("bloqueado_hasta")
        if bloqueado_hasta:
            # Asegurar timezone aware
            if bloqueado_hasta.tzinfo is None:
                bloqueado_hasta = bloqueado_hasta.replace(tzinfo=timezone.utc)
            if now < bloqueado_hasta:
                minutos_restantes = int((bloqueado_hasta - now).total_seconds() / 60) + 1
                raise UnauthorizedException(
                    f"Cuenta bloqueada temporalmente por intentos fallidos. Intente de nuevo en {minutos_restantes} minutos.",
                    codigo="ACCOUNT_LOCKED"
                )
            else:
                # El bloqueo ya expiró, resetear
                await self.db.usuarios.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"intentos_fallidos": 0, "bloqueado_hasta": None}}
                )

        if user.get("estado") == "pendiente":
            raise UnauthorizedException("La cuenta se encuentra pendiente de verificación de correo.", codigo="ACCOUNT_PENDING")

        if user.get("estado") in ["bloqueado", "inactivo"]:
            raise UnauthorizedException("La cuenta está inactiva o bloqueada. Contacte al administrador.", codigo="ACCOUNT_INACTIVE")

        # Verificar contraseña
        if not verify_password(data.password, user["password_hash"]):
            failed = user.get("intentos_fallidos", 0) + 1
            update_data: Dict[str, Any] = {"intentos_fallidos": failed}
            if failed >= settings.MAX_FAILED_PASSWORD_ATTEMPTS:
                lock_time = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
                update_data["bloqueado_hasta"] = lock_time
                EmailService.send_notification(
                    user["email"],
                    "Cuenta bloqueada temporalmente",
                    f"Tu cuenta ha sido bloqueada por {settings.LOCKOUT_MINUTES} minutos debido a 5 intentos fallidos de contraseña."
                )
                await self._log_security("ACCOUNT_LOCKED", user["email"], ip, data.dispositivo_id, False, "Bloqueo por 5 intentos fallidos", user_id)
            
            await self.db.usuarios.update_one({"_id": user["_id"]}, {"$set": update_data})
            await self._log_security("LOGIN_FAILED", user["email"], ip, data.dispositivo_id, False, f"Contraseña incorrecta (intento {failed})", user_id)
            raise UnauthorizedException(generic_error, codigo="INVALID_CREDENTIALS")

        # RF-SEG-06: Validar si este equipo (dispositivo_id) ya tiene una sesión abierta por OTRO usuario
        dispositivo_sesion = await self.db.sesiones.find_one({
            "dispositivo_id": data.dispositivo_id,
            "activa": True,
            "usuario_id": {"$ne": user_id}
        })
        if dispositivo_sesion:
            raise ConflictException(
                "Este equipo ya tiene una sesión abierta con otra cuenta. Debe cerrarla antes de iniciar una nueva sesión.",
                codigo="DEVICE_SESSION_CONFLICT"
            )

        # Verificar si el usuario ya tiene una sesión activa en otro equipo
        otra_sesion = await self.db.sesiones.find_one({
            "usuario_id": user_id,
            "activa": True,
            "dispositivo_id": {"$ne": data.dispositivo_id}
        })
        has_active_session_elsewhere = otra_sesion is not None

        # Generar código OTP de 6 dígitos
        otp = generate_otp()
        otp_hash = hash_token(otp)
        expira_en = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        # Invalidar OTPs previos del mismo usuario
        await self.db.tokens_verificacion.update_many(
            {"usuario_id": user_id, "tipo": TokenType.OTP_LOGIN, "usado": False},
            {"$set": {"usado": True}}
        )

        await self.db.tokens_verificacion.insert_one({
            "usuario_id": user_id,
            "tipo": TokenType.OTP_LOGIN,
            "codigo_hash": otp_hash,
            "intentos": 0,
            "expira_en": expira_en,
            "usado": False,
            "creado_en": now
        })

        EmailService.send_otp_email(user["email"], otp)
        await self._log_security("OTP_SENT", user["email"], ip, data.dispositivo_id, True, "OTP de 6 dígitos emitido", user_id)

        login_ticket = create_login_ticket(user_id, user["email"], data.dispositivo_id)

        return {
            "otp_required": True,
            "login_ticket": login_ticket,
            "has_active_session_elsewhere": has_active_session_elsewhere,
            "mensaje": "Credenciales válidas. Ingrese el código OTP de 6 dígitos enviado a su correo."
        }

    async def resend_otp(self, login_ticket: str, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Reenvía el código OTP respetando el tiempo de espera de 60 segundos."""
        payload = decode_token(login_ticket)
        user_id = payload.get("sub")
        dispositivo_id = payload.get("dispositivo_id")

        user = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundException("Usuario no encontrado")

        now = datetime.now(timezone.utc)
        last_otp = await self.db.tokens_verificacion.find_one(
            {"usuario_id": user_id, "tipo": TokenType.OTP_LOGIN},
            sort=[("creado_en", -1)]
        )

        if last_otp:
            creado_en = last_otp["creado_en"]
            if creado_en.tzinfo is None:
                creado_en = creado_en.replace(tzinfo=timezone.utc)
            delta = (now - creado_en).total_seconds()
            if delta < settings.OTP_RESEND_COOLDOWN_SECONDS:
                espera = int(settings.OTP_RESEND_COOLDOWN_SECONDS - delta)
                raise BadRequestException(
                    f"Debe esperar {espera} segundos antes de solicitar un nuevo código.",
                    codigo="OTP_COOLDOWN"
                )

        # Generar nuevo OTP
        otp = generate_otp()
        otp_hash = hash_token(otp)
        expira_en = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        await self.db.tokens_verificacion.update_many(
            {"usuario_id": user_id, "tipo": TokenType.OTP_LOGIN, "usado": False},
            {"$set": {"usado": True}}
        )

        await self.db.tokens_verificacion.insert_one({
            "usuario_id": user_id,
            "tipo": TokenType.OTP_LOGIN,
            "codigo_hash": otp_hash,
            "intentos": 0,
            "expira_en": expira_en,
            "usado": False,
            "creado_en": now
        })

        EmailService.send_otp_email(user["email"], otp)
        await self._log_security("OTP_RESENT", user["email"], ip, dispositivo_id, True, "OTP reenviado", user_id)

        return {"mensaje": "Nuevo código OTP enviado exitosamente a su correo."}

    async def verify_otp_and_create_session(
        self,
        login_ticket: str,
        otp_code: str,
        forzar_cierre_previa: bool,
        ip: str = "127.0.0.1",
        user_agent: str = ""
    ) -> Dict[str, Any]:
        """
        Paso 2: Valida el OTP, resuelve sesión única y emite la sesión y JWT.
        """
        payload = decode_token(login_ticket)
        user_id = payload.get("sub")
        dispositivo_id = payload.get("dispositivo_id")

        user = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundException("Usuario no encontrado")

        now = datetime.now(timezone.utc)

        # Buscar token OTP activo
        token_doc = await self.db.tokens_verificacion.find_one({
            "usuario_id": user_id,
            "tipo": TokenType.OTP_LOGIN,
            "usado": False,
            "expira_en": {"$gt": now}
        })

        if not token_doc:
            await self._log_security("OTP_FAILED", user["email"], ip, dispositivo_id, False, "OTP expirado o no encontrado", user_id)
            raise BadRequestException("El código OTP ha expirado o no es válido. Solicite uno nuevo.", codigo="OTP_EXPIRED")

        intentos = token_doc.get("intentos", 0)
        if intentos >= settings.OTP_MAX_ATTEMPTS:
            await self.db.tokens_verificacion.update_one({"_id": token_doc["_id"]}, {"$set": {"usado": True}})
            await self._log_security("OTP_FAILED", user["email"], ip, dispositivo_id, False, "Máximo de intentos de OTP superado", user_id)
            raise BadRequestException("Ha superado el número máximo de intentos permitidos (3). Solicite un nuevo código.", codigo="OTP_MAX_ATTEMPTS")

        if hash_token(otp_code.strip()) != token_doc["codigo_hash"]:
            intentos += 1
            await self.db.tokens_verificacion.update_one(
                {"_id": token_doc["_id"]},
                {"$set": {"intentos": intentos}}
            )
            restantes = settings.OTP_MAX_ATTEMPTS - intentos
            await self._log_security("OTP_FAILED", user["email"], ip, dispositivo_id, False, f"OTP incorrecto (quedan {restantes})", user_id)
            raise BadRequestException(f"Código OTP incorrecto. Intentos restantes: {restantes}.", codigo="OTP_INVALID")

        # OTP correcto: marcar como usado
        await self.db.tokens_verificacion.update_one({"_id": token_doc["_id"]}, {"$set": {"usado": True}})

        # RF-SEG-06: Sesión única
        # 1. Si el usuario ya tiene sesión en otro equipo
        sesion_previa_usuario = await self.db.sesiones.find_one({"usuario_id": user_id, "activa": True})
        if sesion_previa_usuario:
            if not forzar_cierre_previa and sesion_previa_usuario.get("dispositivo_id") != dispositivo_id:
                # Avisar al usuario para que confirme en P03
                return {
                    "requiere_confirmacion_cierre": True,
                    "mensaje": "Ya existe una sesión activa en otro equipo. ¿Desea cerrarla e ingresar en este equipo?"
                }
            # Cerrar sesión previa del usuario
            await self.db.sesiones.update_many(
                {"usuario_id": user_id, "activa": True},
                {"$set": {"activa": False}}
            )
            await self._log_security("SESSION_CLOSED_FOR_NEW_LOGIN", user["email"], ip, dispositivo_id, True, "Sesión previa invalidada por nuevo inicio", user_id)

        # 2. Si este dispositivo tiene alguna otra sesión activa, cerrarla
        await self.db.sesiones.update_many(
            {"dispositivo_id": dispositivo_id, "activa": True},
            {"$set": {"activa": False}}
        )

        # Crear nueva sesión activa
        expira_sesion = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        sesion_doc = {
            "usuario_id": user_id,
            "dispositivo_id": dispositivo_id,
            "ip": ip,
            "user_agent": user_agent,
            "refresh_token_hash": None,
            "activa": True,
            "creada_en": now,
            "ultimo_acceso": now,
            "expira_en": expira_sesion
        }
        res_sesion = await self.db.sesiones.insert_one(sesion_doc)
        session_id = str(res_sesion.inserted_id)

        # Obtener todos los permisos consolidados de los roles del usuario
        user_roles = user.get("roles", ["Consulta"])
        roles_cursor = self.db.roles.find({"nombre": {"$in": user_roles}})
        roles_list = await roles_cursor.to_list(length=100)
        permisos_set = set()
        for r in roles_list:
            for p in r.get("permisos", []):
                permisos_set.add(p)

        permisos = list(permisos_set)

        access_token = create_access_token(
            user_id=user_id,
            session_id=session_id,
            email=user["email"],
            roles=user_roles,
            permisos=permisos
        )

        # Resetear intentos fallidos
        await self.db.usuarios.update_one(
            {"_id": user["_id"]},
            {"$set": {"intentos_fallidos": 0, "bloqueado_hasta": None}}
        )

        await self._log_security("LOGIN_SUCCESS", user["email"], ip, dispositivo_id, True, "Inicio de sesión completado con 2FA", user_id)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "session_id": session_id,
            "usuario": {
                "id": user_id,
                "nombre": user["nombre"],
                "email": user["email"],
                "roles": user_roles,
                "proveedor_id": user.get("proveedor_id"),
                "permisos": permisos
            }
        }

    async def forgot_password(self, email: str, captcha_token: str, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """RF-SEG-04: Solicita recuperación de contraseña."""
        await CaptchaService.verify(captcha_token, ip)

        user = await self.db.usuarios.find_one({"email": email.lower()})
        # Por seguridad no revelar si el correo existe
        if user:
            now = datetime.now(timezone.utc)
            token = generate_otp() + generate_otp() + generate_otp()
            token_hash = hash_token(token)
            expira_en = now + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

            await self.db.tokens_verificacion.insert_one({
                "usuario_id": str(user["_id"]),
                "tipo": TokenType.RESET_PASSWORD,
                "codigo_hash": token_hash,
                "intentos": 0,
                "expira_en": expira_en,
                "usado": False,
                "creado_en": now
            })

            EmailService.send_password_reset_email(user["email"], token)
            await self._log_security("PASSWORD_RESET_REQUESTED", user["email"], ip, None, True, "Enlace de recuperación generado", str(user["_id"]))

        return {
            "mensaje": "Si el correo está registrado en el sistema, recibirá un enlace para restablecer su contraseña."
        }

    async def reset_password(self, token: str, nueva_password: str, confirm_password: str, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """RF-SEG-04: Aplica la nueva contraseña e invalida todas las sesiones activas."""
        if nueva_password != confirm_password:
            raise BadRequestException("Las contraseñas no coinciden.", codigo="PASSWORDS_DO_NOT_MATCH")

        validate_password_strength(nueva_password)

        now = datetime.now(timezone.utc)
        token_hash = hash_token(token)

        token_doc = await self.db.tokens_verificacion.find_one({
            "tipo": TokenType.RESET_PASSWORD,
            "codigo_hash": token_hash,
            "usado": False,
            "expira_en": {"$gt": now}
        })

        if not token_doc:
            raise BadRequestException("El enlace de restablecimiento es inválido o ha expirado.", codigo="INVALID_TOKEN")

        user_id = token_doc["usuario_id"]
        user = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundException("Usuario no encontrado")

        # Verificar historial de las últimas 3 contraseñas
        history = user.get("historial_passwords", [])
        check_password_history(nueva_password, history)

        new_hash = get_password_hash(nueva_password)
        history.append(new_hash)
        if len(history) > 5:
            history = history[-5:]

        # Actualizar contraseña
        await self.db.usuarios.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "password_hash": new_hash,
                "historial_passwords": history,
                "intentos_fallidos": 0,
                "bloqueado_hasta": None
            }}
        )

        # Quemar token
        await self.db.tokens_verificacion.update_one({"_id": token_doc["_id"]}, {"$set": {"usado": True}})

        # Cerrar todas las sesiones activas del usuario (RF-SEG-04)
        await self.db.sesiones.update_many(
            {"usuario_id": user_id, "activa": True},
            {"$set": {"activa": False}}
        )

        EmailService.send_notification(
            user["email"],
            "Contraseña actualizada",
            "Tu contraseña ha sido restablecida exitosamente. Todas tus sesiones activas han sido cerradas por seguridad."
        )

        await self._log_security("PASSWORD_CHANGED", user["email"], ip, None, True, "Contraseña restablecida con éxito, sesiones cerradas", user_id)

        return {"mensaje": "Contraseña actualizada exitosamente. Inicie sesión con su nueva contraseña."}

    async def logout(self, session_id: str, user_id: str, ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Cierra la sesión actual invalidándola en base de datos."""
        await self.db.sesiones.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"activa": False}}
        )
        user = await self.db.usuarios.find_one({"_id": ObjectId(user_id)})
        email = user["email"] if user else ""
        await self._log_security("LOGOUT", email, ip, None, True, "Cierre de sesión manual", user_id)
        return {"mensaje": "Sesión cerrada correctamente."}
