# /workspace/ch25/app/api/routes/__init__.py
"""API route registrations."""
from fastapi import APIRouter

from app.api import admin
from app.api.routes import dice, health, lottery, ranking, roulette, season_pass, today_feature

api_router = APIRouter()
api_router.include_router(health.router, prefix="", tags=["health"])
api_router.include_router(today_feature.router)
api_router.include_router(season_pass.router)
api_router.include_router(roulette.router)
api_router.include_router(dice.router)
api_router.include_router(lottery.router)
api_router.include_router(ranking.router)
api_router.include_router(admin.admin_router)
