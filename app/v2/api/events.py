"""Public events status endpoints.

V2 location (Source of Truth). Legacy import paths should re-export this router.

NOTE: URL is intentionally kept as `/api/events/*` for backward compatibility.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.v2.api.deps import get_current_user_id
from app.models.user_segment import UserSegment
from app.schemas.event import ActiveEventOut, EventStatusResponse
from app.v2.services.event_service import V2EventService

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("/status", response_model=EventStatusResponse)
def get_event_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> EventStatusResponse:
    service = V2EventService()
    now = datetime.utcnow()

    gh_status = service.get_golden_hour_status(db, now=now)
    active_events: list[ActiveEventOut] = []

    if gh_status.get("is_active"):
        active_events.append(
            ActiveEventOut(
                event_type="GOLDEN_HOUR",
                label="Golden Hour",
                multiplier=gh_status.get("multiplier"),
                start_time=gh_status.get("start_time_kst"),
                end_time=gh_status.get("end_time_kst"),
                meta={"override": gh_status.get("override")},
            )
        )

    segment = db.query(UserSegment.segment).filter(UserSegment.user_id == user_id).scalar() or "COMMON"
    for cfg in service.list_active_event_configs(db, now=now, segment=segment):
        if cfg.event_type in {"SEGMENT_CAMPAIGN", "GOLDEN_HOUR"}:
            continue
        active_events.append(
            ActiveEventOut(
                event_type=cfg.event_type,
                event_id=cfg.id,
                label=cfg.event_type,
                multiplier=cfg.multiplier,
                start_time=cfg.start_time.isoformat() if cfg.start_time else None,
                end_time=cfg.end_time.isoformat() if cfg.end_time else None,
                meta=cfg.config_json,
            )
        )

    for virtual_event in service.get_segment_campaign_events(db, user_id=user_id, now=now):
        active_events.append(
            ActiveEventOut(
                event_type=virtual_event["event_type"],
                label=virtual_event.get("label"),
                meta=virtual_event.get("meta"),
            )
        )

    return EventStatusResponse(
        is_golden_hour=bool(gh_status.get("is_active")),
        multiplier=float(gh_status.get("multiplier") or 1.0),
        next_event_time=gh_status.get("next_event_time"),
        active_events=active_events,
    )
