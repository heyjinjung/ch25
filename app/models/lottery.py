"""Lottery configuration, prizes, and play logs."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class LotteryConfig(Base):
    """Lottery configuration describing limits and activity."""

    __tablename__ = "lottery_config"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    max_daily_tickets = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    prizes = relationship("LotteryPrize", back_populates="config", cascade="all, delete-orphan")


class LotteryPrize(Base):
    """Lottery prize pool with weighted selection and optional stock."""

    __tablename__ = "lottery_prize"
    __table_args__ = (UniqueConstraint("config_id", "label", name="uq_lottery_prize_label"),)

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("lottery_config.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(100), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    weight = Column(Integer, nullable=False, default=0)
    stock = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    config = relationship("LotteryConfig", back_populates="prizes")


class LotteryLog(Base):
    """User lottery scratch results."""

    __tablename__ = "lottery_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    config_id = Column(Integer, nullable=False)
    prize_id = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
