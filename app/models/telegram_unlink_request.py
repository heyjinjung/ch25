"""Telegram Unlink Request model for 409 conflict resolution."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class TelegramUnlinkRequest(Base):
    """Request to unlink a Telegram account from a user.
    
    Used when a new user encounters a 409 conflict (Telegram ID already linked)
    and needs to submit a formal request for admin review.
    """
    __tablename__ = "telegram_unlink_request"

    id = Column(Integer, primary_key=True, index=True)
    
    # The telegram_id that the user claims ownership of
    telegram_id = Column(String(50), nullable=False, index=True)
    
    # The user currently linked to this telegram_id
    current_user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    
    # The user requesting the unlink (usually a new/different account)
    requester_user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    
    # Request details
    reason = Column(Text, nullable=True)  # User's explanation
    evidence = Column(Text, nullable=True)  # JSON: deposit proof, email, etc.
    
    # Status: PENDING, APPROVED, REJECTED
    status = Column(String(20), default="PENDING", nullable=False, index=True)
    
    # Admin processing
    processed_by = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    admin_memo = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    current_user = relationship("User", foreign_keys=[current_user_id])
    requester_user = relationship("User", foreign_keys=[requester_user_id])
