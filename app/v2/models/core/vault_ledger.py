
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class VaultLedger(Base):
    __tablename__ = "vault_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=True)
    ref_type = Column(String(50), nullable=True) # e.g. "SHOP", "GAME", "ADMIN"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
