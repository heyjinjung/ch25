from .auth_event import V2UserAuthEvent, AuthEventType
from .refresh_token import V2UserRefreshToken
from .user import V2User
from .v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus

# V2 Models
from .v2_admin_message import V2AdminMessage, V2AdminMessageInbox
from .v2_dice import V2DiceLog, V2DiceConfig
from .v2_exchange_log import V2ExchangeLog
from .v2_golden_intervention_log import V2GoldenInterventionLog
from .v2_level_reward import V2LevelRewardTable
from .v2_lottery import V2LotteryLog, V2LotteryConfig, V2LotteryPrize
from .v2_ops_execution_result import V2OpsExecutionResult
from .v2_retention_roi_log import V2RetentionRoiLog
from .v2_roulette import V2RouletteLog, V2RouletteConfig, V2RouletteSegment
from .v2_segment_rule import V2SegmentRule
from .v2_server_config import V2ServerConfig
from .v2_shop_order import V2ShopOrder
from .v2_ticket_conversion_policy import V2TicketConversionPolicy
from .v2_ticket_zero_log import V2TicketZeroLog
from .v2_user_retention_state import V2UserRetentionState
from .v2_user_segment import V2UserSegment
from .hq_prospective_user import HQProspectiveUser

# V1 Compatibility Exports (Shim)
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
