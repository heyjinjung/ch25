"""V2 admin messaging tables."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Index
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2AdminMessage(Base):
    """Message template/history sent by an admin (V2)."""

    __tablename__ = "v2_admin_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_admin_id = Column(Integer, nullable=False, default=0)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    target_type = Column(String(50), nullable=False)
    target_value = Column(String(255), nullable=True)
    channels = Column(JSON, nullable=True)
    recipient_count = Column(Integer, nullable=False, default=0)
    read_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class V2AdminMessageInbox(Base):
    """Individual user inbox entry (V2)."""

    __tablename__ = "v2_admin_message_inbox"
    __table_args__ = (
        Index("ix_v2_admin_message_inbox_user_id", "user_id"),
        Index("ix_v2_admin_message_inbox_message_id", "message_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(Integer, ForeignKey("v2_admin_message.id", ondelete="CASCADE"), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("V2User")
    message = relationship("V2AdminMessage")
