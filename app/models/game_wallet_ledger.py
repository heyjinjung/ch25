"""Ledger for game token balance changes with metadata/label."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.models.game_wallet import GameTokenType


class UserGameWalletLedger(Base):
    __tablename__ = "user_game_wallet_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(SAEnum(GameTokenType), nullable=False, index=True)
    delta = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=True)
    label = Column(String(255), nullable=True)
    meta_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User")
