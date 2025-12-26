"""Activity ingestion endpoints for personalization/segmentation."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import uuid4

from app.api.deps import get_current_user_id, get_db
from app.models.user_activity import UserActivity
from app.models.user_activity_event import UserActivityEvent
from app.schemas.activity import ActivityEventType, ActivityRecordRequest, ActivityRecordResponse

router = APIRouter(prefix="/api/activity", tags=["activity"])


def _get_or_create_activity(db: Session, user_id: int) -> UserActivity:
    activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
    if activity:
        return activity
    activity = UserActivity(user_id=user_id)
    db.add(activity)
    db.flush()
    return activity


@router.post("/record", response_model=ActivityRecordResponse)
def record_activity(
    payload: ActivityRecordRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> ActivityRecordResponse:
    now = datetime.utcnow()
    activity = _get_or_create_activity(db, user_id)

    # Optional idempotency: if event_id was already processed, return without mutating counters.
    # For PLAY_DURATION we always store an event row (generate event_id if missing) so durations can be aggregated.
    should_persist_event = payload.event_type == ActivityEventType.PLAY_DURATION or payload.event_id is not None
    duration_seconds: int | None = None
    if payload.event_type == ActivityEventType.PLAY_DURATION:
        duration_seconds = max(int(payload.value or 0), 0)

    if should_persist_event:
        event_id = str(payload.event_id or uuid4())
        try:
            db.add(
                UserActivityEvent(
                    user_id=user_id,
                    event_id=event_id,
                    event_type=payload.event_type.value,
                    duration_seconds=duration_seconds,
                )
            )
            db.flush()
        except IntegrityError:
            db.rollback()
            # If an explicit event_id is duplicated, return current state for idempotency.
            if payload.event_id is not None:
                activity = _get_or_create_activity(db, user_id)
                db.refresh(activity)
                return ActivityRecordResponse(user_id=user_id, updated_at=activity.updated_at)
            # Auto-generated ids should be unique; if not, continue without failing the request.
            activity = _get_or_create_activity(db, user_id)
            db.refresh(activity)
            return ActivityRecordResponse(user_id=user_id, updated_at=activity.updated_at)

    if payload.event_type == ActivityEventType.ROULETTE_PLAY:
        activity.roulette_plays += 1
        activity.last_play_at = now
    elif payload.event_type == ActivityEventType.DICE_PLAY:
        activity.dice_plays += 1
        activity.last_play_at = now
    elif payload.event_type == ActivityEventType.LOTTERY_PLAY:
        activity.lottery_plays += 1
        activity.last_play_at = now
    elif payload.event_type == ActivityEventType.BONUS_USED:
        activity.last_bonus_used_at = now
    elif payload.event_type == ActivityEventType.PLAY_DURATION:
        if duration_seconds and duration_seconds > 0:
            activity.total_play_duration += duration_seconds

    db.add(activity)
    db.commit()
    db.refresh(activity)
    return ActivityRecordResponse(user_id=user_id, updated_at=activity.updated_at)
