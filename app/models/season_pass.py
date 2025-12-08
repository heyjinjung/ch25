# /workspace/ch25/app/models/season_pass.py
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class SeasonPassConfig(Base):
    """Season metadata including duration and XP configuration."""

    __tablename__ = "season_pass_config"
    __table_args__ = (
        UniqueConstraint("season_name", name="uq_season_name"),
        CheckConstraint("start_date <= end_date", name="ck_season_dates_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    season_name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    max_level = Column(Integer, nullable=False)
    base_xp_per_stamp = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    levels = relationship("SeasonPassLevel", back_populates="season", cascade="all, delete-orphan")
    progresses = relationship("SeasonPassProgress", back_populates="season")
    stamp_logs = relationship("SeasonPassStampLog", back_populates="season")
    reward_logs = relationship("SeasonPassRewardLog", back_populates="season")


class SeasonPassLevel(Base):
    """Level requirements and rewards for a season."""

    __tablename__ = "season_pass_level"
    __table_args__ = (UniqueConstraint("season_id", "level", name="uq_season_level"),)

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("season_pass_config.id", ondelete="CASCADE"), nullable=False)
    level = Column(Integer, nullable=False)
    required_xp = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False)
    auto_claim = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    season = relationship("SeasonPassConfig", back_populates="levels")


class SeasonPassProgress(Base):
    """User progress snapshot for a season."""

    __tablename__ = "season_pass_progress"
    __table_args__ = (UniqueConstraint("user_id", "season_id", name="uq_user_season_progress"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    season_id = Column(Integer, ForeignKey("season_pass_config.id", ondelete="CASCADE"), nullable=False)
    current_level = Column(Integer, nullable=False, default=1)
    current_xp = Column(Integer, nullable=False, default=0)
    total_stamps = Column(Integer, nullable=False, default=0)
    last_stamp_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    season = relationship("SeasonPassConfig", back_populates="progresses")
    stamp_logs = relationship("SeasonPassStampLog", back_populates="progress")
    reward_logs = relationship("SeasonPassRewardLog", back_populates="progress")


class SeasonPassStampLog(Base):
    """Daily stamp log entries capturing source and earned XP."""

    __tablename__ = "season_pass_stamp_log"
    __table_args__ = (
        UniqueConstraint("user_id", "season_id", "source_feature_type", "period_key", name="uq_stamp_user_season_period"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    season_id = Column(Integer, ForeignKey("season_pass_config.id", ondelete="CASCADE"), nullable=False)
    progress_id = Column(Integer, ForeignKey("season_pass_progress.id", ondelete="CASCADE"), nullable=True)
    date = Column(Date, nullable=False)
    period_key = Column(String(32), nullable=False, default="")
    stamp_count = Column(Integer, nullable=False, default=1)
    source_feature_type = Column(String(30), nullable=False)
    xp_earned = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    season = relationship("SeasonPassConfig", back_populates="stamp_logs")
    progress = relationship("SeasonPassProgress", back_populates="stamp_logs")


class SeasonPassRewardLog(Base):
    """Reward claim records per level to avoid duplicate payouts."""

    __tablename__ = "season_pass_reward_log"
    __table_args__ = (
        UniqueConstraint("user_id", "season_id", "level", name="uq_reward_user_season_level"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    season_id = Column(Integer, ForeignKey("season_pass_config.id", ondelete="CASCADE"), nullable=False)
    progress_id = Column(Integer, ForeignKey("season_pass_progress.id", ondelete="CASCADE"), nullable=True)
    level = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False)
    claimed_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    season = relationship("SeasonPassConfig", back_populates="reward_logs")
    progress = relationship("SeasonPassProgress", back_populates="reward_logs")
