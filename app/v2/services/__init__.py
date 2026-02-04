"""V2 service exports.

Avoid eager imports to prevent circular dependencies during app startup/tests.
"""
from importlib import import_module

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
	"V2LotteryGameService",
	"V2SurveyService",
	"V2SurveyRewardService",
	"V2TeamBattleService",
	"V2EventService",
	"V2AdminAuditService",
	"V2AdminInventoryService",
	"V2AdminEconomyService",
	"V2AdminUserService",
	"V2AdminCCDepositService",
	"V2RewardService",
]


def __dir__():
	# help() visibility
	return list(globals().keys())


def __getattr__(name: str):
	mapping = {
		"V2VaultService": ("app.v2.services.vault_service", "V2VaultService"),
		"V2ShopService": ("app.v2.services.shop_service", "V2ShopService"),
		"V2InventoryService": ("app.v2.services.inventory_service", "V2InventoryService"),
		"V2TicketZeroService": ("app.v2.services.ticket_zero_service", "V2TicketZeroService"),
		"V2GameConfigService": ("app.v2.services.game_config_service", "V2GameConfigService"),
		"V2SegmentService": ("app.v2.services.segment_service", "V2SegmentService"),
		"V2AdminMessageService": ("app.v2.services.admin_message_service", "V2AdminMessageService"),
		"V2RouletteGameService": ("app.v2.services.v2_roulette_game_service", "V2RouletteGameService"),
		"V2DiceGameService": ("app.v2.services.v2_dice_game_service", "V2DiceGameService"),
		"V2LotteryGameService": ("app.v2.services.v2_lottery_game_service", "V2LotteryGameService"),
		"V2SurveyService": ("app.v2.services.survey_service", "V2SurveyService"),
		"V2SurveyRewardService": ("app.v2.services.survey_reward_service", "V2SurveyRewardService"),
		"V2TeamBattleService": ("app.v2.services.team_battle_service", "V2TeamBattleService"),
		"V2EventService": ("app.v2.services.event_service", "V2EventService"),
		"V2AdminAuditService": ("app.v2.services.admin_audit_service", "V2AdminAuditService"),
		"V2AdminInventoryService": ("app.v2.services.admin_inventory_service", "V2AdminInventoryService"),
		"V2AdminEconomyService": ("app.v2.services.admin_economy_service", "V2AdminEconomyService"),
		"V2AdminUserService": ("app.v2.services.admin_user_service", "V2AdminUserService"),
		"V2AdminCCDepositService": ("app.v2.services.admin_cc_deposit_service", "V2AdminCCDepositService"),
		"V2RewardService": ("app.v2.services.reward_service", "V2RewardService"),
	}
	if name not in mapping:
		raise AttributeError(f"module 'app.v2.services' has no attribute '{name}'")
	module_name, attr_name = mapping[name]
	module = import_module(module_name)
	return getattr(module, attr_name)
