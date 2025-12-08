"""Base declarative class for SQLAlchemy models."""
from app.db.base_class import Base

# Import models here so Alembic can discover them.
from app.models import (  # noqa: F401
    DiceConfig,
    DiceLog,
    FeatureConfig,
    FeatureSchedule,
    ExternalRankingData,
    ExternalRankingRewardLog,
    GameTokenType,
    LotteryConfig,
    LotteryLog,
    LotteryPrize,
    RankingDaily,
    UserEventLog,
    RouletteConfig,
    RouletteLog,
    RouletteSegment,
    SeasonPassConfig,
    SeasonPassLevel,
    SeasonPassProgress,
    SeasonPassRewardLog,
    SeasonPassStampLog,
    User,
    UserGameWallet,
)
