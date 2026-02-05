"""V2 HQ Daily Withdrawal Log Model - HQ 환전 로그

작성일: 2026-02-05
설계서: docs/v2_specs/07_golden/2026_02_04_v2_integrated_spending_logic_ko.md
"""
from datetime import datetime

from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2HQDailyWithdrawalLog(Base):
    """HQ 환전 로그 테이블

    HQ에서 붙여넣기한 환전 내역을 저장합니다.
    V2User와 매칭되면 v2_spending_ledger에도 기록됩니다.

    매칭 상태 (match_status):
    - MATCHED: V2User와 매칭 성공
    - NOT_FOUND: 닉네임으로 유저를 찾을 수 없음
    """
    __tablename__ = "v2_hq_daily_withdrawal_log"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)

    # 중복 방지 키: MD5(nickname|amount|withdrawal_at)[:16]
    dedup_key = Column(String(64), unique=True, nullable=False, index=True)

    # HQ 원본 데이터
    nickname = Column(String(100), nullable=False, index=True)
    cc_id = Column(String(100), nullable=True)
    amount = Column(BigInteger, nullable=False)
    bet_amount = Column(BigInteger, nullable=True)  # 배팅금 (분석용)
    request_at = Column(DateTime, nullable=True)    # 신청 날짜
    withdrawal_at = Column(DateTime, nullable=False, index=True)  # 환전 날짜
    referrer_code = Column(String(50), nullable=True)  # 소속/추천인
    hq_status = Column(String(20), nullable=False)     # '정상', '취소' 등

    # V2User 매칭 결과
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="SET NULL"), nullable=True, index=True)
    match_status = Column(String(20), nullable=False, default="NOT_FOUND")  # MATCHED, NOT_FOUND

    # Import 배치 정보
    import_batch_id = Column(String(36), nullable=True, index=True)

    # 생성 시각
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("V2User")

    def __repr__(self):
        return f"<V2HQDailyWithdrawalLog(id={self.id}, nickname={self.nickname}, amount={self.amount})>"
