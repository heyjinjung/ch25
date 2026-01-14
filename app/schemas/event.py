"""Schemas for event config and status."""
from __future__ import annotations

from datetime import datetime, time
from typing import Any, Dict, List, Optional

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel


class EventConfigBase(BaseModel):
    event_type: str
    is_active: bool = False
    multiplier: Optional[float] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    target_segment: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None


class EventConfigCreate(EventConfigBase):
    pass


class EventConfigUpdate(BaseModel):
    is_active: Optional[bool] = None
    multiplier: Optional[float] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    target_segment: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None


class EventConfigOut(EventConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActiveEventOut(BaseModel):
    event_type: str
    event_id: Optional[int] = None
    label: Optional[str] = None
    multiplier: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class EventStatusResponse(BaseModel):
    is_golden_hour: bool
    multiplier: float
    next_event_time: Optional[datetime] = None
    active_events: List[ActiveEventOut]


class EventToggleRequest(BaseModel):
    event_id: Optional[int] = None
    event_type: Optional[str] = None
    is_active: bool
