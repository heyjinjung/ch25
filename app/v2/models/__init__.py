"""V2 model exports."""
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.v2.models.v2_ticket_conversion_policy import V2TicketConversionPolicy
from app.v2.models.v2_shop_order import V2ShopOrder
from app.v2.models.v2_exchange_log import V2ExchangeLog
from app.v2.models.v2_ticket_zero_log import V2TicketZeroLog
from app.v2.models.v2_ops_execution_result import V2OpsExecutionResult
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment, V2RouletteLog
from app.v2.models.v2_dice import V2DiceConfig, V2DiceLog
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize, V2LotteryLog
from app.v2.models.v2_segment_rule import V2SegmentRule
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox
from app.v2.models.v2_user_retention_state import V2UserRetentionState
from app.v2.models.v2_retention_roi_log import V2RetentionRoiLog
from app.v2.models.user import V2User
from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType
from app.v2.models.refresh_token import V2UserRefreshToken

# Aliases for backward compatibility: expose v1 models via v2 models namespace so
# v2 code can import from `app.v2.models` while relying on existing v1 DB models.
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger

__all__ = [
    "V2LevelRewardTable",
    "V2TicketConversionPolicy",
    "V2ShopOrder",
    "V2ExchangeLog",
    "V2TicketZeroLog",
    "V2OpsExecutionResult",
    "V2RouletteConfig",
    "V2RouletteSegment",
    "V2RouletteLog",
    "V2DiceConfig",
    "V2DiceLog",
    "V2LotteryConfig",
    "V2LotteryPrize",
    "V2LotteryLog",
    "V2SegmentRule",
    "V2UserSegment",
    "V2AdminMessage",
    "V2AdminMessageInbox",
    "V2UserRetentionState",
    "V2RetentionRoiLog",
    "V2User",
    # Auth models
    "V2UserAuthEvent",
    "AuthEventType",
    "V2UserRefreshToken",
    # v1 model aliases
    "UserGameWallet",
    "UserGameWalletLedger",
    "GameTokenType",
]
