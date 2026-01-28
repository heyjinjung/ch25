"""Pydantic schemas for global level/XP APIs."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from app.schemas.base import KstBaseModel as BaseModel


class LevelRow(BaseModel):
    """Configuration for a single level in the tower."""
    level: int
    required_xp: int
    reward_type: str
    reward_amount: int
    reward_payload: Optional[dict[str, Any]] = None
    auto_grant: bool
    reward_label: Optional[str] = None
    is_unlocked: bool = False
    is_claimed: bool = False


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
    levels: list[LevelRow] = []
    rewards: list[LevelRewardLog] = []


__all__ = [
    "LevelRow",
    "LevelRewardLog",
    "LevelXPStatusResponse",
]
