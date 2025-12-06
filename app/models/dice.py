"""Dice configuration and play logs."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String

from app.db.base_class import Base


class DiceConfig(Base):
    """Dice game configuration for rewards and limits."""

    __tablename__ = "dice_config"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    max_daily_plays = Column(Integer, nullable=False, default=0)
    win_reward_type = Column(String(50), nullable=False, default="NONE")
    win_reward_amount = Column(Integer, nullable=False, default=0)
    draw_reward_type = Column(String(50), nullable=False, default="NONE")
    draw_reward_amount = Column(Integer, nullable=False, default=0)
    lose_reward_type = Column(String(50), nullable=False, default="NONE")
    lose_reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class DiceLog(Base):
    """Dice play outcomes per user."""

    __tablename__ = "dice_log"
    __table_args__ = (
        Index("ix_dice_log_user_created_at", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    config_id = Column(Integer, ForeignKey("dice_config.id", ondelete="CASCADE"), nullable=False)
    user_dice_1 = Column(Integer, nullable=False)
    user_dice_2 = Column(Integer, nullable=False)
    user_sum = Column(Integer, nullable=False)
    dealer_dice_1 = Column(Integer, nullable=False)
    dealer_dice_2 = Column(Integer, nullable=False)
    dealer_sum = Column(Integer, nullable=False)
    result = Column(String(10), nullable=False)
    reward_type = Column(String(50), nullable=False, default="NONE")
    reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
