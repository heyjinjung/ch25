"""Admin route modules namespace."""
from fastapi import APIRouter
from . import admin_users, admin_user_missions

router = APIRouter()
router.include_router(admin_users.router)
router.include_router(admin_user_missions.router)
