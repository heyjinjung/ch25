"""User segmentation table for personalization."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.db.base_class import Base


class UserSegment(Base):
    __tablename__ = "user_segment"

    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    segment = Column(String(50), nullable=False, default="NEW")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
