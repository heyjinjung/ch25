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
        season_pass = SeasonPassService()
        today = date.today()
        today_key = today.isoformat()
        results: list[ExternalRankingData] = []

        for payload in data:
            user_id = AdminExternalRankingService._resolve_user_id(db, payload.user_id, payload.external_id)
            row = existing_by_user.get(user_id)

            # Daily reset for delta tracking
            if row and row.last_daily_reset != today:
                row.daily_base_deposit = row.deposit_amount
                row.daily_base_play = row.play_count
                row.last_daily_reset = today

            if row:
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
                    daily_base_deposit=payload.deposit_amount,
                    daily_base_play=payload.play_count,
                    last_daily_reset=today,
                )
                db.add(row)
                existing_by_user[user_id] = row
            results.append(row)

        db.commit()
        for row in results:
            db.refresh(row)

        # Season pass hooks with period keys (daily/weekly)
        # Daily deltas
        for row in results:
            delta_deposit_today = max(row.deposit_amount - row.daily_base_deposit, 0)
            delta_play_today = max(row.play_count - row.daily_base_play, 0)

            deposit_steps = delta_deposit_today // 100000
            if deposit_steps > 0:
                season_pass.maybe_add_stamp(
                    db,
                    user_id=row.user_id,
                    source_feature_type="EXTERNAL_DEPOSIT_100K",
                    stamp_count=deposit_steps,
                    now=today,
                    period_key=f"DEPOSIT_{today_key}",
                )
            # 첫 이용: 오늘 증가가 1 이상이면 지급
            if delta_play_today > 0:
                season_pass.maybe_add_stamp(
                    db,
                    user_id=row.user_id,
                    source_feature_type="EXTERNAL_SITE_PLAY",
                    now=today,
                    period_key=f"SITE_{today_key}",
                )

        # 주간 TOP10 (ISO 주차)
        top10 = (
            db.execute(
                select(ExternalRankingData)
                .order_by(ExternalRankingData.deposit_amount.desc(), ExternalRankingData.play_count.desc())
                .limit(10)
            )
            .scalars()
            .all()
        )
        iso_year, iso_week, _ = today.isocalendar()
        week_key = f"W{iso_year}-{iso_week:02d}"
        for entry in top10:
            season_pass.maybe_add_stamp(
                db,
                user_id=entry.user_id,
                source_feature_type="EXTERNAL_RANKING_TOP10",
                now=today,
                period_key=f"TOP10_{week_key}",
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
