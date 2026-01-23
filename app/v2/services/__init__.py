"""V2 service exports."""
from app.v2.services.vault_service import V2VaultService
from app.v2.services.shop_service import V2ShopService
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.ticket_zero_service import V2TicketZeroService
from app.v2.services.game_config_service import V2GameConfigService
from app.v2.services.segment_service import V2SegmentService
from app.v2.services.admin_message_service import V2AdminMessageService
from app.v2.services.v2_roulette_game_service import V2RouletteGameService
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.services.survey_service import V2SurveyService
from app.v2.services.survey_reward_service import V2SurveyRewardService

__all__ = [
	"V2VaultService",
	"V2ShopService",
	"V2InventoryService",
	"V2TicketZeroService",
	"V2GameConfigService",
	"V2SegmentService",
	"V2AdminMessageService",
	"V2RouletteGameService",
	"V2DiceGameService",
	"V2SurveyService",
	"V2SurveyRewardService",
]
