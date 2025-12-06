"""Roulette configuration and logs."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class RouletteConfig(Base):
    """Roulette configuration defining wheel segments and limits."""

    __tablename__ = "roulette_config"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    max_daily_spins = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    segments = relationship("RouletteSegment", back_populates="config", cascade="all, delete-orphan")


class RouletteSegment(Base):
    """Six fixed roulette slots per config with weights and rewards."""

    __tablename__ = "roulette_segment"
    __table_args__ = (UniqueConstraint("config_id", "slot_index", name="uq_roulette_segment_slot"),)

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("roulette_config.id", ondelete="CASCADE"), nullable=False)
    slot_index = Column(Integer, nullable=False)  # 0-5 fixed slots
    label = Column(String(50), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    weight = Column(Integer, nullable=False, default=0)
    is_jackpot = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    config = relationship("RouletteConfig", back_populates="segments")


class RouletteLog(Base):
    """User roulette spin log."""

    __tablename__ = "roulette_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    config_id = Column(Integer, nullable=False)
    segment_id = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
