from fastapi import APIRouter

from .marketing_routes import router as marketing_router
from .user_routes import router as user_router
from .economy_routes import router as economy_router
from .ops_routes import router as ops_router
from .segment_routes import router as segment_router
from .vault_routes import router as vault_router
from .game_config_routes import router as game_config_router
from .mission_routes import router as mission_router
from .streak_routes import router as streak_router
from .level_routes import router as level_router
from .inventory_routes import router as inventory_router
from .csv_import_routes import router as csv_import_router
from .team_battle_routes import router as team_battle_router
from .daily_nudge_routes import router as daily_nudge_router
from .roi_routes import router as roi_router
from .rollback_routes import router as rollback_router
from .analytics_routes import router as analytics_router
from .ui_config_routes import router as ui_config_router

router = APIRouter(prefix="/admin", tags=["v2-admin-ui"])
router.include_router(marketing_router)
router.include_router(user_router)
router.include_router(economy_router)
router.include_router(ops_router)
router.include_router(segment_router)
router.include_router(vault_router)
router.include_router(game_config_router)
router.include_router(mission_router)
router.include_router(streak_router)
router.include_router(level_router)
router.include_router(inventory_router)
router.include_router(csv_import_router)
router.include_router(team_battle_router, prefix="/team-battle", tags=["v2-admin-team-battle"])
router.include_router(daily_nudge_router)
router.include_router(roi_router)
router.include_router(rollback_router)
router.include_router(analytics_router)
router.include_router(ui_config_router)

__all__ = ["router"]
