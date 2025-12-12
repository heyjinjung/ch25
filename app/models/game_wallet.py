"""Game token wallet per user and token type."""
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class GameTokenType(str, Enum):
    ROULETTE_COIN = "ROULETTE_COIN"
    DICE_TOKEN = "DICE_TOKEN"
    LOTTERY_TICKET = "LOTTERY_TICKET"
    CC_COIN = "CC_COIN"


class UserGameWallet(Base):
    __tablename__ = "user_game_wallet"
    __table_args__ = (UniqueConstraint("user_id", "token_type", name="uq_user_token_type"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(SAEnum(GameTokenType), nullable=False)
    balance = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
