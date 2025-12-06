# /workspace/ch25/app/models/feature.py
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, Date, DateTime, Enum as SqlEnum, ForeignKey, Index, Integer, JSON, String, UniqueConstraint

from app.db.base_class import Base


class FeatureType(str, Enum):
    """Available feature types for the daily event system."""

    ROULETTE = "ROULETTE"
    DICE = "DICE"
    LOTTERY = "LOTTERY"
    RANKING = "RANKING"
    SEASON_PASS = "SEASON_PASS"
    NONE = "NONE"


class FeatureSchedule(Base):
    """Schedule mapping for which feature is active per date."""

    __tablename__ = "feature_schedule"
    __table_args__ = (UniqueConstraint("date", name="uq_feature_schedule_date"),)

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    feature_type = Column(SqlEnum(FeatureType), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeatureConfig(Base):
    """Feature-level configuration such as title and routing."""

    __tablename__ = "feature_config"
    __table_args__ = (UniqueConstraint("feature_type", name="uq_feature_config_feature_type"),)

    id = Column(Integer, primary_key=True, index=True)
    feature_type = Column(SqlEnum(FeatureType), nullable=False)
    title = Column(String(100), nullable=False)
    page_path = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=True)
    config_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserEventLog(Base):
    """User event audit trail for feature interactions."""

    __tablename__ = "user_event_log"
    __table_args__ = (
        Index("ix_user_event_log_user_created_at", "user_id", "created_at"),
        Index("ix_user_event_log_event_name", "event_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    feature_type = Column(String(30), nullable=False)
    event_name = Column(String(50), nullable=False)
    meta_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
