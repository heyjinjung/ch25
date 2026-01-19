"""V2 roulette configuration and logs."""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2RouletteConfig(Base):
    """V2 roulette configuration defining wheel segments and limits."""

    __tablename__ = "v2_roulette_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    ticket_type = Column(String(50), nullable=False, default="ROULETTE_TICKET")
    is_active = Column(Boolean, nullable=False, default=True)
    max_daily_spins = Column(Integer, nullable=False, default=0)
    grade = Column(String(20), nullable=False, default="COMMON")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    segments = relationship("V2RouletteSegment", back_populates="config", cascade="all, delete-orphan")


class V2RouletteSegment(Base):
    """Six fixed roulette slots per config with weights and rewards."""

    __tablename__ = "v2_roulette_segment"
    __table_args__ = (
        UniqueConstraint("config_id", "slot_index", name="uq_v2_roulette_segment_slot"),
        CheckConstraint("slot_index >= 0 AND slot_index <= 5", name="ck_v2_roulette_segment_slot_range"),
        CheckConstraint("weight >= 0", name="ck_v2_roulette_segment_weight_non_negative"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    config_id = Column(Integer, ForeignKey("v2_roulette_config.id", ondelete="CASCADE"), nullable=False)
    slot_index = Column(Integer, nullable=False)
    label = Column(String(50), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    weight = Column(Integer, nullable=False, default=0)
    is_jackpot = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    config = relationship("V2RouletteConfig", back_populates="segments")


class V2RouletteLog(Base):
    """User roulette spin log."""

    __tablename__ = "v2_roulette_log"
    __table_args__ = (
        Index("ix_v2_roulette_log_user_created_at", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("v2_roulette_config.id", ondelete="CASCADE"), nullable=False)
    segment_id = Column(Integer, ForeignKey("v2_roulette_segment.id", ondelete="CASCADE"), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
