"""Daily delta logs for external ranking deposit metrics (KST date).

This table enables accurate today/last-7d deposit delta KPI.
"""

from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, UniqueConstraint

from app.db.base_class import Base


class ExternalRankingDailyDepositDelta(Base):
    __tablename__ = "external_ranking_daily_deposit_delta"
    __table_args__ = (
        UniqueConstraint("user_id", "kst_date", name="uq_ext_rank_daily_deposit_user_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    kst_date = Column(Date, nullable=False, index=True)
    deposit_delta = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
