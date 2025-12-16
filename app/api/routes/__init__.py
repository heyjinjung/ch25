# /workspace/ch25/app/api/routes/__init__.py
"""API route registrations."""
from fastapi import APIRouter

from app.api import admin
from app.api.routes import activity, auth, dice, health, level_xp, lottery, ranking, roulette, season_pass, today_feature, team_battle, survey, new_member_dice

api_router = APIRouter()
api_router.include_router(health.router, prefix="", tags=["health"])
api_router.include_router(today_feature.router)
api_router.include_router(auth.router)
api_router.include_router(activity.router)
api_router.include_router(season_pass.router)
api_router.include_router(roulette.router)
api_router.include_router(dice.router)
api_router.include_router(lottery.router)
api_router.include_router(ranking.router)
api_router.include_router(team_battle.router)
api_router.include_router(level_xp.router)
api_router.include_router(survey.router)
api_router.include_router(new_member_dice.router)
api_router.include_router(admin.admin_router)
