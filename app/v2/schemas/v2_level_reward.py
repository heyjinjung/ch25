"""V2 level reward table schemas."""
from __future__ import annotations

from typing import Optional

from app.v2.schemas.base import KstBaseModel as BaseModel


class V2LevelRewardRow(BaseModel):
    level: int
    required_xp: int
    reward_type: str
    reward_amount: int
    reward_payload: Optional[dict] = None


class V2LevelRewardTableResponse(BaseModel):
    rows: list[V2LevelRewardRow]


__all__ = [
    "V2LevelRewardRow",
    "V2LevelRewardTableResponse",
]
