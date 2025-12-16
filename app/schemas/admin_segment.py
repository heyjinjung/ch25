from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminUserSegmentResponse(BaseModel):
    user_id: int
    external_id: str
    segment: str
    segment_updated_at: datetime | None = None

    roulette_plays: int = 0
    dice_plays: int = 0
    lottery_plays: int = 0
    total_play_duration: int = 0

    last_login_at: datetime | None = None
    last_charge_at: datetime | None = None
    last_bonus_used_at: datetime | None = None
    activity_updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserSegmentUpsertRequest(BaseModel):
    user_id: int | None = None
    external_id: str | None = None
    segment: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Z0-9_]+$")

