"""V2 Latency Survival - User Deposit Evidence Model."""
from datetime import datetime
from typing import Any

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.schema import Index
import enum

from app.db.base_class import Base

def _utc_now() -> datetime:
    return datetime.utcnow()

class EvidenceStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROVISIONAL = "PROVISIONAL"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class V2UserDepositEvidence(Base):
    __tablename__ = "v2_user_deposit_evidence"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("v2_user.id"), nullable=False, index=True)
    
    # Core Evidence
    tx_id = Column(String(200), nullable=False)  # Unique Index 적용 예정
    image_url = Column(String(500), nullable=True)
    claimed_amount = Column(Integer, nullable=False, default=0)
    
    # State
    status = Column(Enum(EvidenceStatus), nullable=False, default=EvidenceStatus.PENDING, index=True)
    
    # Grant & Match Info
    reward_json = Column(JSON, nullable=True)  # ex: {"ROULETTE_TICKET": 3}
    matched_log_id = Column(Integer, nullable=True)  # Soft link to v2_cc_deposit_log
    admin_memo = Column(Text, nullable=True)
    
    # Timestamps (UTC naive; serialized to KST at API boundary)
    created_at = Column(DateTime, nullable=False, default=_utc_now)
    verified_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index("ix_v2_user_deposit_evidence_tx_id", "tx_id", unique=True),
    )
