"""Ranking daily snapshot model."""
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Integer, String, UniqueConstraint

from app.db.base import Base


class RankingDaily(Base):
    """Admin-entered daily ranking rows."""

    __tablename__ = "ranking_daily"
    __table_args__ = (UniqueConstraint("date", "rank", name="uq_ranking_daily_date_rank"),)

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    user_id = Column(Integer, nullable=True)
    display_name = Column(String(50), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
