"""User model definition."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class User(Base):
    """Application user account."""

    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), nullable=False, unique=True)
    nickname = Column(String(100), nullable=True, index=True)
    password_hash = Column(String(128), nullable=True)
    level = Column(Integer, nullable=False, server_default="1", default=1)
    xp = Column(Integer, nullable=False, server_default="0", default=0)
    status = Column(String(20), nullable=False, default="ACTIVE")
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)

    # Money system
    vault_balance = Column(Integer, nullable=False, server_default="0", default=0)
    # Phase 1: `vault_locked_balance` is the source of truth; `vault_balance` is legacy mirror.
    vault_locked_balance = Column(Integer, nullable=False, server_default="0", default=0)
    # Phase 1: reserved for future separation; does not expire.
    vault_available_balance = Column(Integer, nullable=False, server_default="0", default=0)
    # Phase 1: expiration applies only to locked balance.
    vault_locked_expires_at = Column(DateTime, nullable=True)
    cash_balance = Column(Integer, nullable=False, server_default="0", default=0)
    vault_fill_used_at = Column(DateTime, nullable=True)

    # [Season] Carry-over
    next_season_seed = Column(Integer, nullable=False, server_default="0", default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # [Retention] Ticket Zero Cooldown
    last_free_ticket_claimed_at = Column(DateTime, nullable=True)

    # [Retention] Onboarding
    has_completed_onboarding = Column(Boolean, default=False)

    # [Telegram] Integration
    telegram_id = Column(BigInteger, unique=True, nullable=True, index=True)
    telegram_username = Column(String(100), nullable=True)
    telegram_is_blocked = Column(Boolean, nullable=False, server_default="0", default=False)
    telegram_join_count = Column(Integer, nullable=False, server_default="0", default=0)
    first_login_at = Column(DateTime, nullable=True)

    admin_profile = relationship("AdminUserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
