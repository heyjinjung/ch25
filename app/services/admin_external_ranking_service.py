"""Admin CRUD for external ranking data."""
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.schemas.external_ranking import ExternalRankingCreate, ExternalRankingUpdate
from app.models.user import User


class AdminExternalRankingService:
    """Manage external ranking data rows (deposit amount, play count)."""

    @staticmethod
    def _resolve_user_id(db: Session, payload_user_id: int | None, external_id: str | None) -> int:
        if payload_user_id:
            return payload_user_id
        if external_id:
            user = db.query(User).filter(User.external_id == external_id).first()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
            return user.id
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="USER_REQUIRED")

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
            user_id = AdminExternalRankingService._resolve_user_id(db, payload.user_id, payload.external_id)
            if payload.user_id in existing_by_user:
                row = existing_by_user[payload.user_id]
                row.user_id = user_id
                row.deposit_amount = payload.deposit_amount
                row.play_count = payload.play_count
                row.memo = payload.memo
            else:
                row = ExternalRankingData(
                    user_id=user_id,
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
        if "external_id" in data:
            row.user_id = AdminExternalRankingService._resolve_user_id(db, None, data["external_id"])
        for key, value in data.items():
            if key == "external_id":
                continue
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
