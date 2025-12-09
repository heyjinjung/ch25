"""Admin CRUD for external ranking data and season-pass hooks."""
from datetime import date
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.models.season_pass import SeasonPassStampLog
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
        season_pass = SeasonPassService()
        today = date.today()
        today_key = today.isoformat()

        existing_by_user = {row.user_id: row for row in db.execute(select(ExternalRankingData)).scalars().all()}
        results: list[ExternalRankingData] = []

        for payload in data:
            user_id = AdminExternalRankingService._resolve_user_id(db, payload.user_id, payload.external_id)
            row = existing_by_user.get(user_id)

            # Daily baseline reset happens before overwriting with today's totals
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
                    daily_base_deposit=0,
                    daily_base_play=0,
                    last_daily_reset=today,
                )
                db.add(row)
                existing_by_user[user_id] = row
            results.append(row)

        db.commit()
        for row in results:
            db.refresh(row)

        # Season pass hooks with period keys (daily/weekly)
        current_season = season_pass.get_current_season(db, today)
        if not current_season:
            return results

        season_id = current_season.id

        for row in results:
            deposit_delta = max(row.deposit_amount - (row.daily_base_deposit or 0), 0)
            deposit_steps = deposit_delta // 100_000
            existing_deposit = (
                db.query(func.coalesce(func.sum(SeasonPassStampLog.stamp_count), 0))
                .filter(
                    SeasonPassStampLog.user_id == row.user_id,
                    SeasonPassStampLog.season_id == season_id,
                    SeasonPassStampLog.source_feature_type == "EXTERNAL_DEPOSIT_100K",
                    SeasonPassStampLog.period_key == f"DEPOSIT_{today_key}",
                )
                .scalar()
            )
            to_give = max(deposit_steps - (existing_deposit or 0), 0)
            if to_give > 0:
                season_pass.maybe_add_stamp(
                    db,
                    user_id=row.user_id,
                    source_feature_type="EXTERNAL_DEPOSIT_100K",
                    stamp_count=to_give,
                    now=today,
                    period_key=f"DEPOSIT_{today_key}",
                )

            play_delta = max(row.play_count - (row.daily_base_play or 0), 0)
            if play_delta > 0:
                existing_site = (
                    db.query(SeasonPassStampLog)
                    .filter(
                        SeasonPassStampLog.user_id == row.user_id,
                        SeasonPassStampLog.season_id == season_id,
                        SeasonPassStampLog.source_feature_type == "EXTERNAL_SITE_PLAY",
                        SeasonPassStampLog.period_key == f"SITE_{today_key}",
                    )
                    .one_or_none()
                )
                if not existing_site:
                    season_pass.maybe_add_stamp(
                        db,
                        user_id=row.user_id,
                        source_feature_type="EXTERNAL_SITE_PLAY",
                        now=today,
                        period_key=f"SITE_{today_key}",
                    )

        # Weekly TOP10 (once per ISO week)
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
            existing_top = (
                db.query(SeasonPassStampLog)
                .filter(
                    SeasonPassStampLog.user_id == entry.user_id,
                    SeasonPassStampLog.season_id == season_id,
                    SeasonPassStampLog.source_feature_type == "EXTERNAL_RANKING_TOP10",
                    SeasonPassStampLog.period_key == f"TOP10_{week_key}",
                )
                .one_or_none()
            )
            if not existing_top:
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
