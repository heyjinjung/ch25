"""Tracks how many game tokens a user currently has that originated from TRIAL_GRANT.

This enables reliable routing of trial-play rewards into Vault without heuristics.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.models.game_wallet import GameTokenType


class TrialTokenBucket(Base):
    __tablename__ = "trial_token_bucket"
    __table_args__ = (UniqueConstraint("user_id", "token_type", name="uq_trial_token_bucket_user_token"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(SAEnum(GameTokenType), nullable=False)
    balance = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
