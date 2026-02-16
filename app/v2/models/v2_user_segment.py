"""V2 user segment assignment table."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Index

from app.db.base_class import Base


class V2UserSegment(Base):
    """Stores computed segment for a user (CRM).
    
    HQ Margin CSV 연동 시 자동 업데이트되며,
    잠재 유저 매칭 시에도 세그먼트 정보가 동기화됩니다.
    
    신규 유저 정책 (2026-02-04):
    - 가입 후 7일간은 NEW 세그먼트 강제 유지
    - 7일 후 오전 9시(KST) 이후에 pending_segment로 자동 전환
    """

    __tablename__ = "v2_user_segment"
    __table_args__ = (
        Index("ix_v2_user_segment_segment", "segment"),
    )

    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True)
    segment = Column(String(50), nullable=False, default="COMMON")
    
    # 신규 유저 보호 기간 종료 후 적용할 세그먼트 (HQ에서 가져온 원래 세그먼트)
    pending_segment = Column(String(50), nullable=True, comment="7일 후 적용할 세그먼트 (NEW 보호 기간용)")
    
    # 세그먼트 전환 이력 (Grace Period 판정용)
    previous_segment = Column(String(50), nullable=True, comment="직전 세그먼트 (전환 유예 기간 판정용)")
    
    # HQ Margin CSV 연동 데이터
    total_margin = Column(BigInteger, nullable=True, default=0, comment="총 운영 마진 (충전 - 환전)")
    total_charge = Column(BigInteger, nullable=True, default=0, comment="누적 충전 금액")
    inactive_days = Column(Integer, nullable=True, default=0, comment="미접속 경과일")
    
    # HQ 동기화 메타데이터
    is_synced_from_hq = Column(Boolean, nullable=False, default=False, comment="HQ CSV에서 동기화 여부")
    last_synced_at = Column(DateTime, nullable=True, comment="마지막 HQ 동기화 시각")
    
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
