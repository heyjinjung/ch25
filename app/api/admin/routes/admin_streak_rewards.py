"""Admin endpoints for streak milestone reward operations."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.feature import UserEventLog
from app.models.user import User
from app.schemas.admin_streak_rewards import (
    StreakRewardDailyCountsResponse,
    StreakRewardUserEventsResponse,
    StreakRewardUserEvent,
    StreakRewardUserInfo,
)

# Note: Admin routers use full path prefixes (include_router is prefix-less).
router = APIRouter(prefix="/admin/api/streak-rewards", tags=["admin-streak-rewards"])


def _count_event(db: Session, *, event_name: str) -> int:
    return int(
        db.query(func.count())
        .select_from(UserEventLog)
        .filter(
            UserEventLog.feature_type == "STREAK",
            UserEventLog.event_name == event_name,
        )
        .scalar()
        or 0
    )


@router.get("/daily-counts", response_model=StreakRewardDailyCountsResponse)
def get_daily_counts(
    day: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
) -> StreakRewardDailyCountsResponse:
    day_str = day.isoformat()

    return StreakRewardDailyCountsResponse(
        day=day,
        grant_day3=_count_event(db, event_name=f"streak.reward_grant.3.{day_str}"),
        grant_day7=_count_event(db, event_name=f"streak.reward_grant.7.{day_str}"),
        skip_day3=_count_event(db, event_name=f"streak.reward_skip.3.{day_str}"),
        skip_day7=_count_event(db, event_name=f"streak.reward_skip.7.{day_str}"),
    )


@router.get("/user-events", response_model=StreakRewardUserEventsResponse)
def get_user_events(
    user_id: int | None = Query(default=None, ge=1),
    external_id: str | None = Query(default=None),
    day: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> StreakRewardUserEventsResponse:
    """Fetch streak reward-related logs for a user.

    Supports searching by user_id or external_id.
    """

    user: User | None = None
    if external_id:
        user = db.query(User).filter(User.external_id == external_id).one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    elif user_id is not None:
        user = db.query(User).filter(User.id == int(user_id)).one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    else:
        raise HTTPException(status_code=400, detail="REQUIRE_USER_ID_OR_EXTERNAL_ID")

    q = (
        db.query(UserEventLog)
        .filter(
            UserEventLog.user_id == int(user.id),
            UserEventLog.feature_type == "STREAK",
            UserEventLog.event_name.like("streak.reward_%"),
        )
        .order_by(UserEventLog.created_at.desc())
    )

    if day is not None:
        day_str = day.isoformat()
        q = q.filter(UserEventLog.event_name.like(f"streak.reward_%.{day_str}"))

    rows = q.limit(int(limit)).all()

    return StreakRewardUserEventsResponse(
        user=StreakRewardUserInfo(id=int(user.id), external_id=str(user.external_id), nickname=getattr(user, "nickname", None)),
        items=[
            StreakRewardUserEvent(
                id=int(r.id),
                user_id=int(r.user_id),
                feature_type=str(r.feature_type),
                event_name=str(r.event_name),
                meta_json=r.meta_json,
                created_at=r.created_at,
            )
            for r in rows
        ],
    )
