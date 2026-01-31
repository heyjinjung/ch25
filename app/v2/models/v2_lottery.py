"""V2 lottery configuration, prizes, and play logs."""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2LotteryConfig(Base):
    """V2 lottery configuration describing limits and activity."""

    __tablename__ = "v2_lottery_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    ticket_type = Column(String(50), nullable=False, default="LOTTERY_TICKET")
    is_active = Column(Boolean, nullable=False, default=True)
    max_daily_tickets = Column(Integer, nullable=False, default=0)
    puzzle_piece_probability = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    prizes = relationship("V2LotteryPrize", back_populates="config", cascade="all, delete-orphan")


class V2LotteryPrize(Base):
    """V2 lottery prize pool with weighted selection and optional stock."""

    __tablename__ = "v2_lottery_prize"
    __table_args__ = (
        UniqueConstraint("config_id", "label", name="uq_v2_lottery_prize_label"),
        CheckConstraint("weight >= 0", name="ck_v2_lottery_prize_weight_non_negative"),
        CheckConstraint("stock IS NULL OR stock >= 0", name="ck_v2_lottery_prize_stock_non_negative"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    config_id = Column(Integer, ForeignKey("v2_lottery_config.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(100), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=1)
    weight = Column(Integer, nullable=False, default=0)
    stock = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    config = relationship("V2LotteryConfig", back_populates="prizes")


class V2LotteryLog(Base):
    """User lottery scratch results."""

    __tablename__ = "v2_lottery_log"
    __table_args__ = (
        Index("ix_v2_lottery_log_user_created_at", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("v2_lottery_config.id", ondelete="CASCADE"), nullable=False)
    prize_id = Column(Integer, ForeignKey("v2_lottery_prize.id", ondelete="CASCADE"), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
