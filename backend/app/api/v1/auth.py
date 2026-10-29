from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.api.deps import get_current_user, get_client_ip, get_device_id, CurrentUser
from app.services.auth_service import AuthService
from app.models.user import (
    UserRegister,
    UserLogin,
    UserVerifyOtp,
    UserResendOtp,
    UserForgotPassword,
    UserResetPassword
)

router = APIRouter(prefix="/auth", tags=["Autenticación y Seguridad"])

class VerifyEmailPayload(BaseModel):
    token: str

@router.post("/register")
async def register(
    data: UserRegister,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.register(data, ip)

@router.post("/verify-email")
async def verify_email(
    data: VerifyEmailPayload,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.verify_email(data.token, ip)

@router.post("/login")
async def login_step1(
    data: UserLogin,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.login_step1(data, ip)

@router.post("/verify-otp")
async def verify_otp(
    data: UserVerifyOtp,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    service = AuthService(db)
    return await service.verify_otp_and_create_session(
        login_ticket=data.login_ticket,
        otp_code=data.otp_code,
        forzar_cierre_previa=data.forzar_cierre_previa,
        ip=ip,
        user_agent=user_agent
    )

@router.post("/resend-otp")
async def resend_otp(
    data: UserResendOtp,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.resend_otp(data.login_ticket, ip)

@router.post("/forgot-password")
async def forgot_password(
    data: UserForgotPassword,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.forgot_password(data.email, data.captcha_token, ip)

@router.post("/reset-password")
async def reset_password(
    data: UserResetPassword,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.reset_password(
        token=data.token,
        nueva_password=data.nueva_password,
        confirm_password=data.confirm_password,
        ip=ip
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ip = get_client_ip(request)
    service = AuthService(db)
    return await service.logout(current_user.session_id, current_user.id, ip)

@router.get("/me")
async def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "roles": current_user.roles,
        "permisos": current_user.permisos,
        "proveedor_id": current_user.proveedor_id,
        "session_id": current_user.session_id
    }
