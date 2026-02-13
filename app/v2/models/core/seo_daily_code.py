"""SEO 일일 검색 미션 코드 모델."""
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class SeoDailyCode(Base):
    """매일 자동 생성되는 SEO 미션 코드.

    하루에 1개의 활성 코드만 존재한다.
    Cron 스크립트가 매일 09:00 KST에 새 코드를 생성하고,
    이전 코드의 is_active를 False로 변경한다.
    """
    __tablename__ = "seo_daily_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    target_date = Column(Date, nullable=False, index=True, comment="이 코드가 유효한 날짜 (KST)")
    reward_min = Column(Integer, nullable=False, default=1000, comment="최소 보상 포인트")
    reward_max = Column(Integer, nullable=False, default=5000, comment="최대 보상 포인트")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Seoul")))

    claims = relationship("UserSeoDailyCodeClaim", back_populates="seo_code")


class UserSeoDailyCodeClaim(Base):
    """유저의 SEO 코드 입력 기록.

    UniqueConstraint로 (user_id, seo_code_id) 중복 방지.
    → 계정당 같은 코드 1회만 입력 가능.
    target_date 기준으로 하루 1회 제한은 서비스 레이어에서 추가 검증.
    """
    __tablename__ = "user_seo_daily_code_claim"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("v2_user.id"), nullable=False, index=True)
    seo_code_id = Column(Integer, ForeignKey("seo_daily_code.id"), nullable=False)
    reward_amount = Column(Integer, nullable=False, comment="실제 지급된 포인트 (랜덤)")
    claimed_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Seoul")))

    seo_code = relationship("SeoDailyCode", back_populates="claims")

    __table_args__ = (
        UniqueConstraint("user_id", "seo_code_id", name="uq_user_seo_code"),
        Index("ix_user_seo_claim_date", "user_id", "claimed_at"),
    )
