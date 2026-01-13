from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.db.base_class import Base


class UserIdentityHistory(Base):
    __tablename__ = "user_identity_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True, nullable=False)
    
    # Field that was changed: 'nickname', 'real_name', 'telegram_id', 'telegram_username'
    field_name = Column(String(50), nullable=False)
    
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    
    # ID of the admin who performed the change
    changed_by = Column(Integer, nullable=True)  # Store admin_user_id or similar if available
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
