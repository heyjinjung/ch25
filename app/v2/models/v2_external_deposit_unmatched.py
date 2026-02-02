"""V2 External Deposit Unmatched model for tracking HQ CSV unmatched deposits.

설계 문서: v2_golden_hq_margin_cc_deposit_auto_reflection_design_ko.md
섹션 7.2 신규 테이블 (미매칭 로그)
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, DateTime, Integer, String, BigInteger, Date, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class UnmatchedStatus(str, Enum):
    """미매칭 로그 상태"""
    UNMATCHED = "UNMATCHED"      # 매칭 실패 (유저 미발견)
    AMBIGUOUS = "AMBIGUOUS"      # 동명이인 등 모호한 매칭
    MATCHED = "MATCHED"          # 수동 매칭 완료
    IGNORED = "IGNORED"          # 무시 처리됨


class UnmatchedReason(str, Enum):
    """미매칭 사유"""
    USER_NOT_FOUND = "USER_NOT_FOUND"
    AMBIGUOUS = "AMBIGUOUS"
    DUPLICATE = "DUPLICATE"
    INVALID_DATA = "INVALID_DATA"
    ADMIN_IGNORED = "ADMIN_IGNORED"


class V2ExternalDepositUnmatched(Base):
    """
    HQ Margin CSV Import 시 유저 매칭 실패 건을 기록하는 테이블.
    
    - 30일 보관 정책 적용
    - 수동 매칭 시 즉시 CC Deposit 재처리
    - status: UNMATCHED → MATCHED/IGNORED 전이
    """
    __tablename__ = "v2_external_deposit_unmatched"
    
    __table_args__ = (
        Index('idx_unmatched_kst_date', 'kst_date'),
        Index('idx_unmatched_status', 'status'),
        Index('idx_unmatched_created', 'created_at'),
        Index('idx_unmatched_source_status', 'source', 'status'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(50), nullable=False, default='HQ_MARGIN')
    raw_cc_id = Column(String(100), nullable=False)
    raw_nickname = Column(String(100), nullable=True)
    total_charge = Column(BigInteger, nullable=False)
    prev_total = Column(BigInteger, nullable=False, default=0)
    delta = Column(BigInteger, nullable=False, default=0)
    kst_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=UnmatchedStatus.UNMATCHED.value)
    matched_user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="SET NULL"), nullable=True, index=True)
    matched_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(String(200), nullable=True)
    admin_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship (optional, for eager loading)
    matched_user = relationship("V2User", foreign_keys=[matched_user_id], lazy="joined")

    def __repr__(self) -> str:
        return (
            f"<V2ExternalDepositUnmatched("
            f"id={self.id}, "
            f"cc_id='{self.raw_cc_id}', "
            f"total_charge={self.total_charge}, "
            f"status='{self.status}'"
            f")>"
        )
    
    @property
    def is_pending(self) -> bool:
        """아직 처리되지 않은 미매칭 로그인지 확인"""
        return self.status in (UnmatchedStatus.UNMATCHED.value, UnmatchedStatus.AMBIGUOUS.value)
