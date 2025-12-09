"""Ranking service for daily leaderboard lookup."""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.models.feature import FeatureType
from app.schemas.ranking import ExternalRankingEntry, RankingTodayResponse
from app.services.feature_service import FeatureService


class RankingService:
    """Provide today's ranking list and the caller's position."""

    def __init__(self) -> None:
        self.feature_service = FeatureService()

    def get_today_ranking(self, db: Session, user_id: int, now: date | datetime, top_n: int = 10) -> RankingTodayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.RANKING)

        external_rows = db.execute(
            select(ExternalRankingData, User.nickname, User.external_id)
            .join(User, User.id == ExternalRankingData.user_id, isouter=True)
            .order_by(
                ExternalRankingData.deposit_amount.desc(),
                ExternalRankingData.play_count.desc(),
                ExternalRankingData.user_id.asc(),
            )
        ).all()
        external_entries = [
            ExternalRankingEntry(
                rank=idx + 1,
                user_id=row.ExternalRankingData.user_id,
                user_name=row.nickname or row.external_id or f"ID {row.ExternalRankingData.user_id}",
                deposit_amount=row.ExternalRankingData.deposit_amount,
                play_count=row.ExternalRankingData.play_count,
                memo=row.ExternalRankingData.memo,
            )
            for idx, row in enumerate(external_rows)
        ]
        my_external_entry = next((entry for entry in external_entries if entry.user_id == user_id), None)

        return RankingTodayResponse(
            date=today,
            entries=[],
            my_entry=None,
            external_entries=external_entries,
            my_external_entry=my_external_entry,
            feature_type=FeatureType.RANKING,
        )
