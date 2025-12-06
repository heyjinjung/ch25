# /workspace/ch25/app/services/admin_feature_schedule_service.py
from datetime import date
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.feature import FeatureSchedule
from app.schemas.admin_feature_schedule import (
    AdminFeatureScheduleBase,
    AdminFeatureScheduleResponse,
)


class AdminFeatureScheduleService:
    """Admin operations for feature_schedule respecting one-feature-per-day rule."""

    @staticmethod
    def list_schedules(db: Session, start_date: date, end_date: date) -> List[AdminFeatureScheduleResponse]:
        rows = (
            db.execute(
                select(FeatureSchedule).where(
                    FeatureSchedule.date >= start_date,
                    FeatureSchedule.date <= end_date,
                )
            )
            .scalars()
            .all()
        )
        return [AdminFeatureScheduleResponse.from_orm(row) for row in rows]

    @staticmethod
    def upsert_schedule(db: Session, day: date, data: AdminFeatureScheduleBase) -> FeatureSchedule:
        # NOTE: 날짜 계산은 Asia/Seoul 기준이어야 함. Path/param으로 받은 date도 동일 기준이라고 가정한다.
        schedule = db.execute(select(FeatureSchedule).where(FeatureSchedule.date == day)).scalar_one_or_none()
        if schedule is None:
            schedule = FeatureSchedule(date=day)
        schedule.feature_type = data.feature_type
        schedule.season_id = data.season_id
        schedule.is_active = data.is_active

        db.add(schedule)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="INVALID_FEATURE_SCHEDULE")
        db.refresh(schedule)
        return schedule

    @staticmethod
    def delete_schedule(db: Session, day: date) -> None:
        schedule = db.execute(select(FeatureSchedule).where(FeatureSchedule.date == day)).scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SCHEDULE_NOT_FOUND")
        db.delete(schedule)
        db.commit()
