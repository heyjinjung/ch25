"""Base declarative class for SQLAlchemy models."""
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import models here so Alembic can discover them.
from app.models import (  # noqa: F401
    DiceConfig,
    DiceLog,
    FeatureConfig,
    FeatureSchedule,
    LotteryConfig,
    LotteryLog,
    LotteryPrize,
    RankingDaily,
    RouletteConfig,
    RouletteLog,
    RouletteSegment,
    SeasonPassConfig,
    SeasonPassLevel,
    SeasonPassProgress,
    SeasonPassRewardLog,
    SeasonPassStampLog,
    User,
)
