# /workspace/ch25/app/services/admin_ranking_service.py
from datetime import date
from typing import Iterable, List

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.ranking import RankingDaily
from app.schemas.admin_ranking import (
    AdminRankingEntryCreate,
    AdminRankingEntryResponse,
)


class AdminRankingService:
    """Admin operations for ranking_daily with UNIQUE(date, rank) enforcement."""

    @staticmethod
    def list_ranking(db: Session, day: date) -> List[AdminRankingEntryResponse]:
        rows = (
            db.execute(
                select(RankingDaily).where(RankingDaily.date == day).order_by(RankingDaily.rank)
            )
            .scalars()
            .all()
        )
        return [AdminRankingEntryResponse.from_orm(row) for row in rows]

    @staticmethod
    def upsert_ranking_entries(db: Session, day: date, entries: Iterable[AdminRankingEntryCreate]) -> None:
        # Replace the entire set for the date to keep rank uniqueness simple and predictable.
        db.execute(delete(RankingDaily).where(RankingDaily.date == day))

        records = []
        for entry in entries:
            records.append(
                RankingDaily(
                    date=day,
                    rank=entry.rank,
                    user_id=entry.user_id,
                    display_name=entry.user_name,
                    score=entry.score or 0,
                )
            )

        db.add_all(records)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="RANKING_CONFLICT",
            )

    @staticmethod
    def delete_ranking_for_date(db: Session, day: date) -> None:
        result = db.execute(delete(RankingDaily).where(RankingDaily.date == day))
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RANKING_NOT_FOUND")
        db.commit()
