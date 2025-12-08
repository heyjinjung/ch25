# /workspace/ch25/app/api/admin/__init__.py
"""Admin API router registration."""
from fastapi import APIRouter

from app.api.admin.routes import (
    admin_dice,
    admin_game_tokens,
    admin_feature_schedule,
    admin_lottery,
    admin_ranking,
    admin_roulette,
    admin_seasons,
    admin_external_ranking,
)

admin_router = APIRouter()
admin_router.include_router(admin_seasons.router)
admin_router.include_router(admin_feature_schedule.router)
admin_router.include_router(admin_roulette.router)
admin_router.include_router(admin_dice.router)
admin_router.include_router(admin_lottery.router)
admin_router.include_router(admin_ranking.router)
admin_router.include_router(admin_game_tokens.router)
admin_router.include_router(admin_external_ranking.router)
