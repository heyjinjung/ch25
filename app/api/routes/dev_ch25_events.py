"""Development-only endpoints for ch25_events testing."""
from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.services.ch25_event_service import Ch25EventService

router = APIRouter()


@router.post("/ch25-events/publish")
async def publish_ch25_event(payload: dict):
    settings = get_settings()
    if settings.env not in ["local", "development", "dev"]:
        raise HTTPException(status_code=403, detail="Dev endpoints disabled in production")

    event_type = payload.get("event_type")
    data = payload.get("data")
    cooldown_sec = payload.get("cooldown_sec", 60)

    if not event_type or not isinstance(event_type, str):
        raise HTTPException(status_code=400, detail="INVALID_EVENT_TYPE")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="INVALID_DATA")
    if not isinstance(cooldown_sec, int) or cooldown_sec < 0:
        raise HTTPException(status_code=400, detail="INVALID_COOLDOWN")

    service = Ch25EventService()
    published = service.publish_event(event_type, data, cooldown_sec=cooldown_sec)
    return {"published": bool(published)}
