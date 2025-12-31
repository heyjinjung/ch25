# /workspace/ch25/app/api/routes/__init__.py
"""API route registrations."""
from fastapi import APIRouter

from app.api import admin
from app.api.routes import (
	activity,
	auth,
	dice,
	health,
	lottery,
	mission,
	ranking,
	roulette,
	season_pass,
	today_feature,
	team_battle,
	survey,
	new_member_dice,
	vault,
	ui_config,
	ui_copy,
	trial_grant,
	crm_inbox,
	telegram,
	new_user_onboarding,
	viral,
	admin_mission,
	admin_user_merge,
	telegram_unlink,
	dev_auth,
	inventory_shop,
)

api_router = APIRouter()

# Dev endpoints (only enabled in development)
api_router.include_router(dev_auth.router, prefix="/dev", tags=["dev"])

api_router.include_router(health.router, prefix="", tags=["health"])
api_router.include_router(today_feature.router)
api_router.include_router(auth.router)
api_router.include_router(activity.router)
api_router.include_router(season_pass.router)
api_router.include_router(roulette.router)
api_router.include_router(dice.router)
api_router.include_router(lottery.router)
api_router.include_router(mission.router)
api_router.include_router(ranking.router)
api_router.include_router(team_battle.router)
api_router.include_router(survey.router)
api_router.include_router(new_member_dice.router)
api_router.include_router(vault.router)
api_router.include_router(ui_config.router)
api_router.include_router(ui_copy.router)
api_router.include_router(trial_grant.router)
api_router.include_router(crm_inbox.router)
api_router.include_router(telegram.router)
api_router.include_router(viral.router)
api_router.include_router(new_user_onboarding.router)
api_router.include_router(admin.admin_router)
api_router.include_router(admin_mission.router)
api_router.include_router(admin_user_merge.router)
api_router.include_router(telegram_unlink.router)
api_router.include_router(telegram_unlink.admin_router)
api_router.include_router(inventory_shop.router)
