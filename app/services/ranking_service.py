"""Ranking service for daily leaderboard lookup."""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.models.feature import FeatureType
from app.models.ranking import RankingDaily
from app.schemas.ranking import ExternalRankingEntry, RankingEntry, RankingTodayResponse
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

        external_rows = (
            db.execute(
                select(ExternalRankingData).order_by(
                    ExternalRankingData.deposit_amount.desc(),
                    ExternalRankingData.play_count.desc(),
                    ExternalRankingData.user_id.asc(),
                )
            )
            .scalars()
            .all()
        )
        external_entries = [
            ExternalRankingEntry(
                rank=idx + 1,
                user_id=row.user_id,
                deposit_amount=row.deposit_amount,
                play_count=row.play_count,
                memo=row.memo,
            )
            for idx, row in enumerate(external_rows)
        ]
        my_external_entry = next((entry for entry in external_entries if entry.user_id == user_id), None)

        top_entries = [RankingEntry.model_validate(row) for row in top_rows]
        my_entry = RankingEntry.model_validate(my_row) if my_row else None

        return RankingTodayResponse(
            date=today,
            entries=top_entries,
            my_entry=my_entry,
            external_entries=external_entries,
            my_external_entry=my_external_entry,
            feature_type=FeatureType.RANKING,
        )
