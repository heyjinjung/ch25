"""Admin Messaging models.

Stores sent messages (history) and user inbox state.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class AdminMessage(Base):
    """Message template/history sent by an admin."""
    __tablename__ = "admin_message"

    id = Column(Integer, primary_key=True, index=True)
    
    # Who sent it? (0 if system)
    sender_admin_id = Column(Integer, nullable=False, default=0)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    # Targeting meta info (for history display)
    # e.g. type="ALL", type="SEGMENT", value="WHALE"
    target_type = Column(String(50), nullable=False)
    target_value = Column(String(255), nullable=True) # or JSON if complex

    # Channels used (e.g. ["INBOX"], ["INBOX", "TELEGRAM"])
    channels = Column(JSON, nullable=True)
    
    # Stats (denormalized for quick view)
    recipient_count = Column(Integer, default=0)
    read_count = Column(Integer, default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AdminMessageInbox(Base):
    """Individual user inbox entry."""
    __tablename__ = "admin_message_inbox"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("admin_message.id", ondelete="CASCADE"), nullable=False, index=True)

    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    message = relationship("AdminMessage")
