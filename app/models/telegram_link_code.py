"""Telegram Link Code model for short start_param mapping."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class TelegramLinkCode(Base):
    """Short code mapping for Telegram account linking.
    
    Replaces JWT-based start_param with a short DB-backed code
    to avoid Telegram's startapp length limitations.
    """
    __tablename__ = "telegram_link_code"

    code = Column(String(16), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    client_ip = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User")
