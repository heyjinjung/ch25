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
# These models are still V1 (app.models) but must be imported via app.v2.models
# to pass the "Pure V2 Native" SOT compliance check.
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_segment import UserSegment
from app.models.segment_rule import SegmentRule
from app.models.external_ranking import ExternalRankingData, ExternalRankingRewardLog
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_ledger import VaultLedger
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.models.mission import Mission, UserMissionProgress, MissionCategory, ApprovalStatus, MissionRewardType, UserStreak
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType, UserEventLog
from app.models.admin_user_profile import AdminUserProfile
from app.models.admin_message import AdminMessage, AdminMessageInbox
from app.models.admin_audit_log import AdminAuditLog
from app.models.ops_log import OpsDailyLog, OpsLogEntry

from app.models.ops_plan import OpsCampaign, OpsPlan, OpsPlanTask
from app.models.ops_eval_metric import OpsEvalMetric
from app.models.ops_target import OpsTargetList, OpsTargetMember
from app.models.event import EventConfig, EventParticipationLog
from app.models.survey import (
    Survey,
    SurveyQuestion,
    SurveyOption,
    SurveyTriggerRule,
    SurveyResponse,
    SurveyResponseAnswer,
    SurveyStatus,
    SurveyChannel,
    SurveyQuestionType,
    SurveyTriggerType,
    SurveyResponseStatus,
    SurveyRewardStatus,
)
from app.models.app_ui_config import AppUiConfig
from app.models.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from app.models.dice import DiceConfig, DiceLog
from app.models.roulette import RouletteConfig, RouletteLog, RouletteSegment
from app.models.lottery import LotteryConfig, LotteryLog, LotteryPrize
from app.models.user_cash_ledger import UserCashLedger
from app.models.user_retention_state import UserRetentionState
from app.models.idempotency import UserIdempotencyKey
from app.models.trial_token_bucket import TrialTokenBucket
from app.models.telegram_link_code import TelegramLinkCode
from app.models.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
from app.models.vault2 import VaultProgram, VaultStatus
from app.models.ranking import RankingDaily
from app.models.user_activity_event import UserActivityEvent
from app.models.season_pass import SeasonPassProgress, SeasonPassRewardLog, SeasonPassStampLog


