"""V2 user model (Vault SoT: vault_locked_balance)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import BigInteger, Column, DateTime, Integer, String

from app.db.base_class import Base


def _kst_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Seoul"))


class V2User(Base):
    __tablename__ = "v2_user"

    id = Column(Integer, primary_key=True, index=True)
    cc_id = Column(String(100), nullable=False, unique=True)
    nickname = Column(String(100), nullable=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True, index=True)
    telegram_username = Column(String(100), nullable=True, index=True)
    vault_locked_balance = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=_kst_now)
    updated_at = Column(DateTime, nullable=False, default=_kst_now, onupdate=_kst_now)
