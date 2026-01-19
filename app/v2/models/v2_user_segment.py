"""V2 user segment assignment table."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index

from app.db.base_class import Base


class V2UserSegment(Base):
    """Stores computed segment for a user (CRM)."""

    __tablename__ = "v2_user_segment"
    __table_args__ = (
        Index("ix_v2_user_segment_segment", "segment"),
    )

    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True)
    segment = Column(String(50), nullable=False, default="NEW")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
