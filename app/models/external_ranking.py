"""External ranking data captured from other platforms and payout logs."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class ExternalRankingData(Base):
    """Per-user external ranking inputs (deposit amount, play count)."""

    __tablename__ = "external_ranking_data"
    __table_args__ = (UniqueConstraint("user_id", name="uq_external_ranking_user"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    deposit_amount = Column(Integer, nullable=False, default=0)
    play_count = Column(Integer, nullable=False, default=0)
    memo = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    reward_logs = relationship("ExternalRankingRewardLog", back_populates="data")


class ExternalRankingRewardLog(Base):
    """Audit log for rewards granted based on external ranking."""

    __tablename__ = "external_ranking_reward_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    season_name = Column(String(50), nullable=False)
    data_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    data = relationship("ExternalRankingData", back_populates="reward_logs", primaryjoin="ExternalRankingRewardLog.data_id==ExternalRankingData.id", viewonly=True)
