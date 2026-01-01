"""Vault withdrawal request model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class VaultWithdrawalRequest(Base):
    __tablename__ = "vault_withdrawal_request"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    
    amount = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED, CANCELLED
    
    admin_memo = Column(String(255), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(Integer, nullable=True)  # Admin User ID

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
