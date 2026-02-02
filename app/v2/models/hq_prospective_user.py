"""HQ Prospective User model for tracking unjoined high-value users."""
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, BigInteger, Boolean, Index, UniqueConstraint, ForeignKey

from app.db.base_class import Base

class HQProspectiveUser(Base):
    """
    Stores HQ margin data for users who have not yet joined the Telegram/V2 system.
    This allows immediate segment assignment upon registration.
    """
    __tablename__ = "hq_prospective_user"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(100), nullable=False, index=True)
    cc_id = Column(String(100), nullable=False)
    total_margin = Column(BigInteger, default=0)
    total_charge = Column(BigInteger, default=0)
    inactive_days = Column(Integer, default=0)
    segment = Column(String(50), nullable=False)
    is_joined = Column(Boolean, default=False, index=True)
    
    # Linking fields
    linked_user_id = Column(Integer, ForeignKey("v2_user.id"), nullable=True, index=True)
    linked_at = Column(DateTime, nullable=True)
    ignored = Column(Boolean, default=False, index=True)  # Admin이 무시 처리한 경우
    ignored_at = Column(DateTime, nullable=True)
    ignored_reason = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('nickname', 'cc_id', name='_nickname_ccid_uc'),
    )

    def __repr__(self):
        return f"<HQProspectiveUser(nickname='{self.nickname}', segment='{self.segment}', is_joined={self.is_joined})>"
