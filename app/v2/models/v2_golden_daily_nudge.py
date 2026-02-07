"""Golden Daily Nudge model for tracking daily notification status and rewards."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.v2.utils.timezone import kst_now


class V2GoldenDailyNudge(Base):
    __tablename__ = "v2_golden_daily_nudge"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Schedule info
    scheduled_at = Column(DateTime, nullable=False)
    
    # Content
    message = Column(String(500), nullable=True)
    
    # Status: PENDING, SENT, EXPIRED, FAILED
    status = Column(String(20), nullable=False, default="PENDING")
    
    sent_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=kst_now)
    updated_at = Column(DateTime, nullable=False, default=kst_now, onupdate=kst_now)

    # Relationships
    user = relationship("V2User", backref="golden_nudges")
