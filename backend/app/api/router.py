from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.products import router as products_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.requests import router as requests_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.movements import router as movements_router
from app.api.v1.audit import router as audit_router
from app.api.v1.dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(products_router)
api_router.include_router(suppliers_router)
api_router.include_router(requests_router)
api_router.include_router(inventory_router)
api_router.include_router(movements_router)
api_router.include_router(audit_router)
api_router.include_router(dashboard_router)
