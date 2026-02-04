"""HQ Daily Deposit Log Model

중복 입금 방지를 위한 처리 로그 테이블.
(닉네임, 금액, 입금시각) 조합으로 중복 체크.

설계: 2026-02-04
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class HQDailyDepositLog(Base):
    """HQ 일별 입금 처리 로그
    
    중복 방지용: dedup_key로 이미 처리된 건인지 체크
    """
    __tablename__ = "hq_daily_deposit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 중복 방지 키 (닉네임+금액+시각 해시)
    dedup_key: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    
    # 원본 데이터 (디버깅/조회용)
    nickname: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    deposit_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # CSV의 충전 시각
    
    # 매칭 결과
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 매칭된 V2User.id
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # MATCHED, NOT_FOUND, AMBIGUOUS
    
    # 메타
    import_batch_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 같은 배치 구분
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_hq_daily_deposit_log_nickname", "nickname"),
        Index("ix_hq_daily_deposit_log_user_id", "user_id"),
        Index("ix_hq_daily_deposit_log_deposit_at", "deposit_at"),
    )
