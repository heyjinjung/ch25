"""V2 Spending Ledger Model - 지출 통합 원장

작성일: 2026-02-05
설계서: docs/v2_specs/07_golden/2026_02_04_v2_integrated_spending_logic_ko.md
"""
from datetime import datetime

from sqlalchemy import Column, Integer, BigInteger, String, Date, DateTime, ForeignKey, Index, JSON
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2SpendingLedger(Base):
    """지출 통합 원장 테이블

    지출 소스 (spending_source):
    - HQ_W: HQ 환전 (외부 카지노에서 환전)
    - VAULT_W: 금고 출금 (내부 금고에서 출금 승인)
    - SHOP_U: 상점 사용 (상점 아이템 구매)

    통화 유형 (currency_type):
    - KRW: 원화 (환전/출금)
    - POINT: 포인트 (상점 구매)
    - G_W: 게임 지갑 (예비)
    """
    __tablename__ = "v2_spending_ledger"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)

    # 중복 방지 키: {SOURCE}_{REF_ID} 형식
    # 예: HQ_W_a1b2c3d4e5f6g7h8, VAULT_W_123, SHOP_U_456
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)

    # 유저 FK
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)

    # 원본 금액
    amount = Column(BigInteger, nullable=False)

    # 통화 유형
    currency_type = Column(String(20), nullable=False)  # KRW, POINT, G_W

    # KRW 환산 금액
    converted_krw_amount = Column(BigInteger, nullable=False)

    # 지출 소스
    spending_source = Column(String(20), nullable=False, index=True)  # HQ_W, VAULT_W, SHOP_U

    # 운영일 (KST 09:00 리셋 기준)
    kst_date = Column(Date, nullable=False, index=True)

    # 메타데이터 (JSON)
    metadata_json = Column(JSON().with_variant(mysql.JSON, "mysql"), nullable=True, name="metadata")

    # 생성 시각
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("V2User", back_populates="spending_records")

    # 복합 인덱스
    __table_args__ = (
        Index("idx_spending_date_source", "kst_date", "spending_source"),
    )

    def __repr__(self):
        return f"<V2SpendingLedger(id={self.id}, tx={self.transaction_id}, amount={self.amount})>"
