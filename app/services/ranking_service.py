"""Ranking service for daily leaderboard lookup."""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.feature import FeatureType
from app.models.ranking import RankingDaily
from app.schemas.ranking import RankingEntry, RankingTodayResponse
from app.services.feature_service import FeatureService


class RankingService:
    """Provide today's ranking list and the caller's position."""

    def __init__(self) -> None:
        self.feature_service = FeatureService()

    def get_today_ranking(self, db: Session, user_id: int, now: date | datetime, top_n: int = 10) -> RankingTodayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.RANKING)

        top_rows = (
            db.execute(
                select(RankingDaily).where(RankingDaily.date == today).order_by(RankingDaily.rank).limit(top_n)
            )
            .scalars()
            .all()
        )
        my_row = db.execute(
            select(RankingDaily).where(RankingDaily.date == today, RankingDaily.user_id == user_id)
        ).scalar_one_or_none()

        top_entries = [RankingEntry.from_orm(row) for row in top_rows]
        my_entry = RankingEntry.from_orm(my_row) if my_row else None

        return RankingTodayResponse(date=today, top=top_entries, me=my_entry, feature_type=FeatureType.RANKING)
