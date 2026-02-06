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
from .v2_game_log import V2GameLog
from .v2_external_deposit_unmatched import V2ExternalDepositUnmatched, UnmatchedStatus, UnmatchedReason
from .v2_hq_daily_deposit_log import HQDailyDepositLog
from .v2_spending_ledger import V2SpendingLedger
from .v2_hq_daily_withdrawal_log import V2HQDailyWithdrawalLog

# V1 Compatibility Exports (Shim)
# These models are now physically located in app/v2/models/core/
from .core.game_wallet import UserGameWallet, GameTokenType
from .core.game_wallet_ledger import UserGameWalletLedger
from .core.user import User
from .core.user_activity import UserActivity
from .core.user_segment import UserSegment
from .core.segment_rule import SegmentRule
from .core.external_ranking import ExternalRankingData, ExternalRankingRewardLog
from .core.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from .core.vault_earn_event import VaultEarnEvent
from .core.vault_ledger import VaultLedger
from .core.vault_withdrawal_request import VaultWithdrawalRequest
from .core.inventory import UserInventoryItem, UserInventoryLedger
from .core.mission import Mission, UserMissionProgress, MissionCategory, ApprovalStatus, MissionRewardType, UserStreak
from .core.feature import FeatureConfig, FeatureSchedule, FeatureType, UserEventLog
from .core.admin_user_profile import AdminUserProfile
from .core.admin_message import AdminMessage, AdminMessageInbox
from .core.admin_audit_log import AdminAuditLog
from .core.ops_log import OpsDailyLog, OpsLogEntry

from .core.ops_plan import OpsCampaign, OpsPlan, OpsPlanTask
from .core.ops_eval_metric import OpsEvalMetric
from .core.ops_target import OpsTargetList, OpsTargetMember
from .core.event import EventConfig, EventParticipationLog
from app.v2.models.v2_survey import (
    V2Survey as Survey,
    V2SurveyQuestion as SurveyQuestion,
    V2SurveyOption as SurveyOption,
    V2SurveyTriggerRule as SurveyTriggerRule,
    # 2.1 출금 조건 (세그먼트별, 최근 3일 기준)
    # | 세그먼트 | 최근 3일 게임 플레이 횟수 | 오늘 사용 금액(상점 이용) | 비고 |
    # | :--- | :--- | :--- | :--- |
    # | NEW | 5회 | 0원 | 신규 혜택 |
    # | COMMON | 15회 | 5,000원 | 당일 1만↑ 입금 |
    # | VIP | 10회 | 0원 | 당일 10만↑ 입금 |
    # | WHALE | 0회 | 0원 | 당일 10만↑ 입금 |
    # | AT_RISK | 30회 | 10,000원 | 완화됨 |
    #
    # - 기준 시간: Asia/Seoul, 오전 9시 리셋(Operational Day)
    # - WHALE은 플레이/소비 조건 면제(0/0), **당일 실질 입금 조건(10만+)은 유지**
    # - **어드민 관리**: `benefits_suspended` 상태는 어드민에서 유저별 수동 관리 기능을 제공함
    V2SurveyResponse as SurveyResponse,
    V2SurveyResponseAnswer as SurveyResponseAnswer,
    # 4.1.1 세그먼트별 출금 조건 (최근 3일 기준)
    # | 세그먼트 | 최근 3일 게임 플레이 횟수 | 오늘 사용 금액(상점 이용) | 비고 |
    # | :--- | :--- | :--- | :--- |
    # | NEW | 5회 | 0원 | 신규 혜택 |
    # | COMMON | 15회 | 5,000원 | 당일 1만↑ 입금 |
    # | VIP | 10회 | 0원 | 당일 10만↑ 입금 |
    # | WHALE | 0회 | 0원 | 당일 10만↑ 입금 |
    # | AT_RISK | 30회 | 10,000원 | 완화됨 |
    SurveyStatus,
    SurveyChannel,
    SurveyQuestionType,
    SurveyTriggerType,
    SurveyResponseStatus,
    SurveyRewardStatus,
)
from .core.app_ui_config import AppUiConfig
from .core.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from .core.dice import DiceConfig, DiceLog
from .core.roulette import RouletteConfig, RouletteLog, RouletteSegment
from .core.lottery import LotteryConfig, LotteryLog, LotteryPrize
from .core.user_cash_ledger import UserCashLedger
from .core.user_retention_state import UserRetentionState
from .core.idempotency import UserIdempotencyKey
from .core.trial_token_bucket import TrialTokenBucket
from .core.telegram_link_code import TelegramLinkCode
from .core.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
from .core.vault2 import VaultProgram, VaultStatus
from .core.ranking import RankingDaily
from .core.user_activity_event import UserActivityEvent
from .core.season_pass import SeasonPassConfig, SeasonPassLevel, SeasonPassProgress, SeasonPassRewardLog, SeasonPassStampLog


