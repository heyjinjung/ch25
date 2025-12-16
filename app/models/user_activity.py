"""User activity aggregation table for personalization/segmentation."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, UniqueConstraint

from app.db.base_class import Base


class UserActivity(Base):
    __tablename__ = "user_activity"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_activity_user"),
        Index("ix_user_activity_user_updated_at", "user_id", "updated_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)

    # Optional mirror field; user.last_login_at already exists.
    last_login_at = Column(DateTime, nullable=True)

    # In this codebase, "charge" is derived from external_ranking_data updates.
    last_charge_at = Column(DateTime, nullable=True)

    roulette_plays = Column(Integer, nullable=False, default=0, server_default="0")
    dice_plays = Column(Integer, nullable=False, default=0, server_default="0")
    lottery_plays = Column(Integer, nullable=False, default=0, server_default="0")
    total_play_duration = Column(Integer, nullable=False, default=0, server_default="0")

    last_bonus_used_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
