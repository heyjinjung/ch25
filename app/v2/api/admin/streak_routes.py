"""V2 Admin Streak Routes."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_info
from app.models.feature import UserEventLog
from app.models.user import User
from app.schemas.admin_streak_rewards import (
    StreakRewardDailyCountsResponse,
    StreakRewardUserEventsResponse,
    StreakRewardUserEvent,
    StreakRewardUserInfo,
)

from app.v2.services.v2_admin_mission_service import V2AdminMissionService

router = APIRouter(prefix="/streak-rewards", tags=["v2-admin-streak"])


@router.get("/daily-counts", response_model=StreakRewardDailyCountsResponse)
def get_streak_daily_counts(
    day: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    day_str = day.isoformat()
    return StreakRewardDailyCountsResponse(
        day=day,
        grant_day3=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_grant.3.{day_str}"),
        grant_day7=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_grant.7.{day_str}"),
        skip_day3=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_skip.3.{day_str}"),
        skip_day7=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_skip.7.{day_str}"),
    )


@router.get("/user-events", response_model=StreakRewardUserEventsResponse)
def get_streak_user_events(
    user_id: Optional[int] = Query(None, ge=1),
    external_id: Optional[str] = Query(None),
    day: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    user = None
    if external_id:
        user = db.query(User).filter(User.external_id == external_id).first()
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    elif user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    else:
        raise HTTPException(status_code=400, detail="REQUIRE_USER_ID_OR_EXTERNAL_ID")

    query = (
        db.query(UserEventLog)
        .filter(
            UserEventLog.user_id == user.id,
            UserEventLog.feature_type == "STREAK",
            UserEventLog.event_name.like("streak.reward_%")
        )
        .order_by(UserEventLog.created_at.desc())
    )

    if day:
        day_str = day.isoformat()
        query = query.filter(UserEventLog.event_name.like(f"streak.reward_%.{day_str}"))

    rows = query.limit(limit).all()

    return StreakRewardUserEventsResponse(
        user=StreakRewardUserInfo(
            id=user.id,
            external_id=user.external_id,
            nickname=user.nickname
        ),
        items=[
            StreakRewardUserEvent(
                id=r.id,
                user_id=r.user_id,
                feature_type=r.feature_type,
                event_name=r.event_name,
                meta_json=r.meta_json,
                created_at=r.created_at
            ) for r in rows
        ]
    )
