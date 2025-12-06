# /workspace/ch25/app/api/admin/routes/admin_feature_schedule.py
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_feature_schedule import AdminFeatureScheduleBase, AdminFeatureScheduleResponse
from app.services.admin_feature_schedule_service import AdminFeatureScheduleService

router = APIRouter(prefix="/admin/api/feature-schedule", tags=["admin-feature-schedule"])


@router.get("/", response_model=list[AdminFeatureScheduleResponse])
def list_schedules(start_date: date, end_date: date, db: Session = Depends(get_db)):
    return AdminFeatureScheduleService.list_schedules(db, start_date, end_date)


@router.put("/{day}", response_model=AdminFeatureScheduleResponse)
def upsert_schedule(day: date, payload: AdminFeatureScheduleBase, db: Session = Depends(get_db)):
    schedule = AdminFeatureScheduleService.upsert_schedule(db, day, payload)
    return AdminFeatureScheduleResponse.from_orm(schedule)


@router.delete("/{day}", status_code=204)
def delete_schedule(day: date, db: Session = Depends(get_db)):
    AdminFeatureScheduleService.delete_schedule(db, day)
    return None
