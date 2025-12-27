"""Admin User Profile model for CRM.

Stores sensitive/external management data (Real Name, Phone, Telegram, Memo, Tags).
Synced typically via Excel/CSV upload.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class AdminUserProfile(Base):
    __tablename__ = "admin_user_profile"

    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    
    # External ID mirror (optional, for easier lookup without join)
    external_id = Column(String(100), index=True, nullable=True)

    # PII & Contact Info
    real_name = Column(String(100), nullable=True)
    phone_number = Column(String(50), nullable=True)
    telegram_id = Column(String(100), index=True, nullable=True)

    # CRM Data
    # tags array: ["VIP", "Blacklist", "Check1225"]
    tags = Column(JSON, nullable=True)
    
    # Admin internal memo
    memo = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="admin_profile")
