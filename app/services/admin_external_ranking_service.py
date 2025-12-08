"""Admin CRUD for external ranking data and season-pass hooks."""
from datetime import date
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.schemas.external_ranking import ExternalRankingCreate, ExternalRankingUpdate
from app.models.user import User
from app.services.season_pass_service import SeasonPassService


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
        existing_by_user = {row.user_id: row for row in db.execute(select(ExternalRankingData)).scalars().all()}
        prev_deposits: dict[int, int] = {uid: row.deposit_amount for uid, row in existing_by_user.items()}
        prev_plays: dict[int, int] = {uid: row.play_count for uid, row in existing_by_user.items()}
        season_pass = SeasonPassService()
        today = date.today()
        results: list[ExternalRankingData] = []
        for payload in data:
            user_id = AdminExternalRankingService._resolve_user_id(db, payload.user_id, payload.external_id)
            prev_row = existing_by_user.get(user_id)
            if prev_row:
                row = prev_row
                row.user_id = user_id  # keep normalized user_id
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
                existing_by_user[user_id] = row
            results.append(row)
        db.commit()
        for row in results:
            db.refresh(row)

        # Season pass hooks: external deposit/play thresholds and TOP10.
        for row in results:
            prev_deposit = prev_deposits.get(row.user_id, 0)
            prev_play = prev_plays.get(row.user_id, 0)
            # 100,000 단위마다 stamp_count 누적
            deposit_steps = row.deposit_amount // 100000 - prev_deposit // 100000
            if deposit_steps > 0:
                season_pass.maybe_add_stamp(
                    db,
                    user_id=row.user_id,
                    source_feature_type="EXTERNAL_DEPOSIT_100K",
                    stamp_count=deposit_steps,
                    now=today,
                )
            # 첫 이용(0 -> 1 이상) 스탬프
            if prev_play == 0 and row.play_count > 0:
                season_pass.maybe_add_stamp(
                    db,
                    user_id=row.user_id,
                    source_feature_type="EXTERNAL_SITE_PLAY",
                    now=today,
                )

        top10 = (
            db.execute(
                select(ExternalRankingData)
                .order_by(ExternalRankingData.deposit_amount.desc(), ExternalRankingData.play_count.desc())
                .limit(10)
            )
            .scalars()
            .all()
        )
        for entry in top10:
            season_pass.maybe_add_stamp(
                db,
                user_id=entry.user_id,
                source_feature_type="EXTERNAL_RANKING_TOP10",
                now=today,
            )
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
