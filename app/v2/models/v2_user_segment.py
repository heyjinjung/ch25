"""V2 user segment assignment table."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Index

from app.db.base_class import Base


class V2UserSegment(Base):
    """Stores computed segment for a user (CRM).
    
    HQ Margin CSV 연동 시 자동 업데이트되며,
    잠재 유저 매칭 시에도 세그먼트 정보가 동기화됩니다.
    """

    __tablename__ = "v2_user_segment"
    __table_args__ = (
        Index("ix_v2_user_segment_segment", "segment"),
    )

    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True)
    segment = Column(String(50), nullable=False, default="COMMON")
    
    # HQ Margin CSV 연동 데이터
    total_margin = Column(BigInteger, nullable=True, default=0, comment="총 운영 마진 (충전 - 환전)")
    total_charge = Column(BigInteger, nullable=True, default=0, comment="누적 충전 금액")
    inactive_days = Column(Integer, nullable=True, default=0, comment="미접속 경과일")
    
    # HQ 동기화 메타데이터
    is_synced_from_hq = Column(Boolean, nullable=False, default=False, comment="HQ CSV에서 동기화 여부")
    last_synced_at = Column(DateTime, nullable=True, comment="마지막 HQ 동기화 시각")
    
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
