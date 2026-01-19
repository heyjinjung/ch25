"""Schemas for event config and status."""
from __future__ import annotations

from datetime import datetime, time
from typing import Any, Dict, List, Optional, Literal

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
    golden_hour: Optional["GoldenHourStatus"] = None


class EventToggleRequest(BaseModel):
    event_id: Optional[int] = None
    event_type: Optional[str] = None
    is_active: bool


# V2 Golden Hour Policy (SoT aligned)
GoldenHourOverride = Literal["AUTO", "FORCE_ON", "FORCE_OFF"]


class GoldenHourConfig(BaseModel):
    enabled: bool = False
    manual_override: GoldenHourOverride = "AUTO"
    multiplier: float = 2.0
    start_time_kst: str = "20:00"
    end_time_kst: str = "22:00"
    base_amount_gate: Optional[int] = None


class GoldenHourStatus(BaseModel):
    is_golden_hour: bool
    multiplier: float
    start_time_kst: str
    end_time_kst: str
