"""V2 user model (Vault SoT: vault_locked_balance)."""
from datetime import datetime
from enum import Enum as PyEnum
from zoneinfo import ZoneInfo

from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base


def _kst_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Seoul"))


class V2UserStatus(str, PyEnum):
    """V2 User status enum."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    ADMIN = "ADMIN"


class V2UserRole(str, PyEnum):
    """V2 User role enum for RBAC."""
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class V2User(Base):
    __tablename__ = "v2_user"

    id = Column(Integer, primary_key=True, index=True)
    cc_id = Column(String(100), nullable=False, unique=True)
    nickname = Column(String(100), nullable=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True, index=True)
    telegram_username = Column(String(100), nullable=True, index=True)
    vault_locked_balance = Column(Integer, nullable=False, default=0)
    vault_available_balance = Column(Integer, nullable=False, default=0)
    # V2 SoT: 레벨/XP (user_level_progress에서 이관됨)
    level = Column(Integer, nullable=False, default=1)
    xp = Column(Integer, nullable=False, default=0)
    vault_spent_total = Column(Integer, nullable=False, default=0)
    vault_spent_today = Column(Integer, nullable=False, default=0)
    vault_spent_reset_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    # V2 SoT: 입금 누적 (external_ranking_data에서 이관됨)
    total_charge_amount = Column(Integer, nullable=False, default=0)
    # V2 가입 시점 기준 누적 충전액 (CSV Import 시 차액 계산용)
    baseline_charge_amount = Column(Integer, nullable=False, default=0)
    # Streak system inherited for mission logic
    play_streak = Column(Integer, nullable=False, default=0)
    last_play_date = Column(Date, nullable=True)
    # Login tracking for retention/analytics
    last_login_at = Column(DateTime, nullable=True, index=True)
    first_deposit_at = Column(DateTime, nullable=True)
    first_deposit_amount = Column(BigInteger, nullable=True)

    # V2-only: status and role for direct V2 auth
    status = Column(Enum(V2UserStatus), nullable=False, default=V2UserStatus.ACTIVE)
    role = Column(Enum(V2UserRole), nullable=False, default=V2UserRole.USER)
    password_hash = Column(String(128), nullable=True)
    created_at = Column(DateTime, nullable=False, default=_kst_now)
    updated_at = Column(DateTime, nullable=False, default=_kst_now, onupdate=_kst_now)
    
    # External platform linking (HQ Casino 연동)
    external_nickname = Column(String(100), nullable=True, index=True)
    external_linked_at = Column(DateTime, nullable=True)
    hq_segment = Column(String(50), nullable=True)  # VIP, WHALE, AT_RISK from HQ

    # Relationships for wallet/inventory (FK migrated from legacy user)
    game_wallets = relationship("UserGameWallet", back_populates="user", lazy="dynamic")
    
    # V2 Game Log relationship (for CSV import analytics)
    game_logs = relationship("V2GameLog", back_populates="user", lazy="dynamic")

    # Admin Profile link ( CRM Data )
    admin_profile = relationship("AdminUserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
