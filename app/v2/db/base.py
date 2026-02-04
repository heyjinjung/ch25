"""Base declarative class for V2 models."""
from app.db.base_class import Base

from app.v2.models import (  # noqa: F401
    V2LevelRewardTable,
    V2TicketConversionPolicy,
    V2ShopOrder,
    V2ExchangeLog,
    V2TicketZeroLog,
    V2OpsExecutionResult,
    V2RouletteConfig,
    V2RouletteSegment,
    V2RouletteLog,
    V2DiceConfig,
    V2DiceLog,
    V2LotteryConfig,
    V2LotteryPrize,
    V2LotteryLog,
    V2SegmentRule,
    V2UserSegment,
    V2AdminMessage,
    V2AdminMessageInbox,
    V2UserRetentionState,
    V2RetentionRoiLog,
    V2User,
)

__all__ = ["Base"]
