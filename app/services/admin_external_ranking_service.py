"""Admin CRUD for external ranking data and season-pass hooks."""
from datetime import date, datetime, timedelta
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.models.user_activity import UserActivity
from app.models.season_pass import SeasonPassStampLog
from app.schemas.external_ranking import ExternalRankingCreate, ExternalRankingUpdate
from app.models.user import User
from app.services.season_pass_service import SeasonPassService
from app.core.config import get_settings


class AdminExternalRankingService:
    """Manage external ranking data rows (deposit amount, play count)."""

    STEP_AMOUNT = 100_000
    XP_PER_STEP = 20
    MAX_STEPS_PER_DAY = 50

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
        settings = get_settings()
        today = date.today()
        now = datetime.utcnow()
        step_amount = AdminExternalRankingService.STEP_AMOUNT
        xp_per_step = AdminExternalRankingService.XP_PER_STEP
        max_steps_per_day = AdminExternalRankingService.MAX_STEPS_PER_DAY
        cooldown_minutes = max(settings.external_ranking_deposit_cooldown_minutes, 0)

        existing_by_user = {row.user_id: row for row in db.execute(select(ExternalRankingData)).scalars().all()}
        # Snapshot pre-update values per user to compute deltas correctly later
        prev_snapshot: dict[int, dict] = {
            row.user_id: {
                "deposit_amount": row.deposit_amount,
                "deposit_remainder": row.deposit_remainder or 0,
                "daily_base_deposit": row.daily_base_deposit or 0,
                "updated_at": row.updated_at,
            }
            for row in existing_by_user.values()
        }
        results: list[ExternalRankingData] = []

        for payload in data:
            user_id = AdminExternalRankingService._resolve_user_id(db, payload.user_id, payload.external_id)
            row = existing_by_user.get(user_id)
            prev_deposit = row.deposit_amount if row else 0
            prev_play = row.play_count if row else 0

            # Daily baseline reset happens before overwriting with today's totals
            if row and row.last_daily_reset != today:
                row.daily_base_deposit = row.deposit_amount
                row.daily_base_play = row.play_count
                row.deposit_remainder = 0
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

        # Personalization hook: if deposit_amount increased (vs pre-update snapshot), treat as "charge" update.
        # We don't have per-transaction charge logs in this codebase; the best available timestamp is row.updated_at.
        for row in results:
            snap = prev_snapshot.get(row.user_id, {"deposit_amount": 0})
            prev_amount = int(snap.get("deposit_amount") or 0)
            if int(row.deposit_amount or 0) > prev_amount:
                activity = db.query(UserActivity).filter(UserActivity.user_id == row.user_id).first()
                if not activity:
                    activity = UserActivity(user_id=row.user_id)
                    db.add(activity)
                activity.last_charge_at = row.updated_at
        db.commit()

        # Season pass XP hooks (daily deltas) + weekly TOP10 stamp
        current_season = season_pass.get_current_season(db, today)
        if not current_season:
            return results

        season_id = current_season.id

        for row in results:
            # 예치: step_amount 단위당 XP 지급 + remainder 누적 (사용자별 이전 상태 기준)
            snap = prev_snapshot.get(
                row.user_id,
                {"deposit_amount": 0, "deposit_remainder": 0, "daily_base_deposit": 0, "updated_at": None},
            )

            baseline = max(snap.get("deposit_amount", 0), row.daily_base_deposit or 0)
            deposit_delta = max(row.deposit_amount - baseline, 0)
            total_for_step = snap.get("deposit_remainder", 0) + deposit_delta
            deposit_steps = total_for_step // step_amount
            remainder = total_for_step % step_amount

            # 상한 적용 (0이면 무제한)
            if max_steps_per_day > 0:
                deposit_steps = min(deposit_steps, max_steps_per_day)

            # 쿨다운: 최근 업데이트가 cooldown_minutes 이내면 지급만 보류하고 remainder만 저장
            if deposit_steps > 0 and cooldown_minutes > 0 and snap.get("updated_at"):
                if now - snap["updated_at"] < timedelta(minutes=cooldown_minutes):
                    row.deposit_remainder = remainder
                    continue

            if deposit_steps > 0 and xp_per_step > 0:
                xp_to_add = deposit_steps * xp_per_step
                season_pass.add_bonus_xp(db, user_id=row.user_id, xp_amount=xp_to_add, now=today)

            row.deposit_remainder = remainder

            # 이용 횟수: 1회당 20 XP 지급 (일일 누적 대비 증분 계산)
            # play_count 기반 XP 지급은 비활성

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
