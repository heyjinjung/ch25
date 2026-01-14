"""Admin endpoints for event config management."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_db
from app.models.event import EventConfig
from app.schemas.event import EventConfigCreate, EventConfigOut, EventConfigUpdate, EventToggleRequest

router = APIRouter(prefix="/admin/api/events", tags=["admin-events"])


@router.get("/configs", response_model=list[EventConfigOut])
def list_event_configs(
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> list[EventConfigOut]:
    return db.query(EventConfig).order_by(EventConfig.id.desc()).all()


@router.post("/configs", response_model=EventConfigOut, status_code=status.HTTP_201_CREATED)
def create_event_config(
    payload: EventConfigCreate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> EventConfigOut:
    row = EventConfig(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/configs/{event_id}", response_model=EventConfigOut)
def update_event_config(
    event_id: int,
    payload: EventConfigUpdate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> EventConfigOut:
    row = db.get(EventConfig, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="EVENT_CONFIG_NOT_FOUND")
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    for key, value in patch.items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/toggle", response_model=list[EventConfigOut])
def toggle_event(
    payload: EventToggleRequest,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> list[EventConfigOut]:
    if payload.event_id is None and payload.event_type is None:
        raise HTTPException(status_code=400, detail="EVENT_ID_OR_TYPE_REQUIRED")

    rows: list[EventConfig] = []
    if payload.event_id is not None:
        row = db.get(EventConfig, payload.event_id)
        if not row:
            raise HTTPException(status_code=404, detail="EVENT_CONFIG_NOT_FOUND")
        rows = [row]
    else:
        rows = (
            db.query(EventConfig)
            .filter(EventConfig.event_type == payload.event_type)
            .all()
        )
        if not rows:
            raise HTTPException(status_code=404, detail="EVENT_CONFIG_NOT_FOUND")

    for row in rows:
        row.is_active = payload.is_active
        db.add(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows
