"""Pydantic schemas for global level/XP APIs."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from app.schemas.base import KstBaseModel as BaseModel


class LevelRewardLog(BaseModel):
    """Reward log entry for a reached global level."""

    level: int
    reward_type: str
    reward_payload: Optional[dict[str, Any]] = None
    auto_granted: bool
    granted_at: datetime
    granted_by: Optional[int] = None


class LevelXPStatusResponse(BaseModel):
    """Global level/XP snapshot with reward history."""

    current_level: int
    current_xp: int
    next_level: Optional[int] = None
    next_required_xp: Optional[int] = None
    xp_to_next: Optional[int] = None
    rewards: list[LevelRewardLog]


__all__ = [
    "LevelRewardLog",
    "LevelXPStatusResponse",
]
