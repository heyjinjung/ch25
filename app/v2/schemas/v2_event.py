"""V2 schemas for event config and status."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Literal

from pydantic import ConfigDict

from app.v2.schemas.base import KstBaseModel as BaseModel


class ActiveEventOut(BaseModel):
    event_type: str
    event_id: Optional[int] = None
    label: Optional[str] = None
    multiplier: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class GoldenHourOverride(str, Enum):
    AUTO = "AUTO"
    FORCE_ON = "FORCE_ON"
    FORCE_OFF = "FORCE_OFF"


class EventStatusResponse(BaseModel):
    is_golden_hour: bool
    multiplier: float
    next_event_time: Optional[datetime] = None
    active_events: List[ActiveEventOut]
    golden_hour: Optional["GoldenHourStatus"] = None


class GoldenHourStatus(BaseModel):
    is_golden_hour: bool
    is_upcoming: bool = False
    minutes_until_start: Optional[int] = None
    multiplier: float
    start_time_kst: str
    end_time_kst: str
    enabled: bool = True
