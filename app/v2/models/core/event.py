"""Event config and participation log models."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Time
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

from app.db.base_class import Base


class EventConfig(Base):
    """Event configuration (global or segment-targeted)."""

    __tablename__ = "event_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_type = Column(String(50), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=False, server_default="0")
    multiplier = Column(Float, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    target_segment = Column(String(50), nullable=True, index=True)
    config_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventParticipationLog(Base):
    """Event participation log for auditing and KPI tracking."""

    __tablename__ = "event_participation_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("event_config.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=True, index=True)
    participated_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    reward_type = Column(String(50), nullable=True)
    reward_amount = Column(Integer, nullable=True)
    meta_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)
