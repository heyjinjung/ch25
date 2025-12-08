"""Admin CRUD for external ranking data."""
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.schemas.external_ranking import ExternalRankingCreate, ExternalRankingUpdate


class AdminExternalRankingService:
    """Manage external ranking data rows (deposit amount, play count)."""

    @staticmethod
    def list_all(db: Session) -> list[ExternalRankingData]:
        return db.execute(select(ExternalRankingData).order_by(ExternalRankingData.deposit_amount.desc())).scalars().all()

    @staticmethod
    def get_by_user(db: Session, user_id: int) -> ExternalRankingData:
        row = (
            db.execute(select(ExternalRankingData).where(ExternalRankingData.user_id == user_id))
            .scalars()
            .first()
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EXTERNAL_RANKING_NOT_FOUND")
        return row

    @staticmethod
    def upsert_many(db: Session, data: Iterable[ExternalRankingCreate]) -> list[ExternalRankingData]:
        existing_by_user = {
            row.user_id: row for row in db.execute(select(ExternalRankingData)).scalars().all()
        }
        results: list[ExternalRankingData] = []
        for payload in data:
            if payload.user_id in existing_by_user:
                row = existing_by_user[payload.user_id]
                row.deposit_amount = payload.deposit_amount
                row.play_count = payload.play_count
                row.memo = payload.memo
            else:
                row = ExternalRankingData(
                    user_id=payload.user_id,
                    deposit_amount=payload.deposit_amount,
                    play_count=payload.play_count,
                    memo=payload.memo,
                )
                db.add(row)
            results.append(row)
        db.commit()
        for row in results:
            db.refresh(row)
        return results

    @staticmethod
    def update(db: Session, user_id: int, payload: ExternalRankingUpdate) -> ExternalRankingData:
        row = AdminExternalRankingService.get_by_user(db, user_id)
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(row, key, value)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def delete(db: Session, user_id: int) -> None:
        result = db.execute(delete(ExternalRankingData).where(ExternalRankingData.user_id == user_id))
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EXTERNAL_RANKING_NOT_FOUND")
        db.commit()
