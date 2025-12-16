"""Idempotency log for /api/activity/record events."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint

from app.db.base_class import Base


class UserActivityEvent(Base):
    __tablename__ = "user_activity_event"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_user_activity_event_event_id"),
        Index("ix_user_activity_event_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), nullable=False)
    event_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
