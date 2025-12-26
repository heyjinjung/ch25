"""Vault earn event log (idempotent).

This table records accrual events that add to the Phase 1 vault locked balance.
"""

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class VaultEarnEvent(Base):
    __tablename__ = "vault_earn_event"
    __table_args__ = (
        Index("ix_vault_earn_event_user_created_at", "user_id", "created_at"),
        Index("uq_vault_earn_event_earn_event_id", "earn_event_id", unique=True),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    # Globally unique idempotency key, e.g. "GAME:DICE:123".
    earn_event_id = Column(String(128), nullable=False)

    # Logical type, e.g. GAME_PLAY / TRIAL_PAYOUT.
    earn_type = Column(String(50), nullable=False)

    # Amount added into Phase 1 locked balance.
    amount = Column(Integer, nullable=False)

    # Where it came from (e.g. DICE/ROULETTE/LOTTERY).
    source = Column(String(50), nullable=False)

    # Optional: what kind of reward this was (e.g. BASE/BONUS/TRIAL).
    reward_kind = Column(String(50), nullable=True)

    # Optional: game_type/token_type for observability.
    game_type = Column(String(50), nullable=True)
    token_type = Column(String(50), nullable=True)

    # Optional raw payload for debugging/ops.
    payout_raw_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True, default=dict)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User")
