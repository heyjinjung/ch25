"""V2 progression (level point) schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import Field

from app.v2.schemas.base import KstBaseModel as BaseModel


class V2LevelRewardLog(BaseModel):
    level: int
    reward_type: str
    reward_payload: Optional[dict[str, Any]] = None
    auto_granted: bool
    granted_at: datetime


class V2LevelStatusResponse(BaseModel):
    current_level: int
    current_level_point: int
    next_level: Optional[int] = None
    next_required_point: Optional[int] = None
    point_to_next: Optional[int] = None
    rewards: list[V2LevelRewardLog] = Field(default_factory=list)


__all__ = [
    "V2LevelRewardLog",
    "V2LevelStatusResponse",
]
