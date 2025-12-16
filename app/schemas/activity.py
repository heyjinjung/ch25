"""Pydantic schemas for activity ingestion."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ActivityEventType(str, Enum):
    ROULETTE_PLAY = "ROULETTE_PLAY"
    DICE_PLAY = "DICE_PLAY"
    LOTTERY_PLAY = "LOTTERY_PLAY"
    BONUS_USED = "BONUS_USED"
    PLAY_DURATION = "PLAY_DURATION"


class ActivityRecordRequest(BaseModel):
    event_type: ActivityEventType
    event_id: UUID | None = Field(default=None, description="Optional idempotency key for deduping")
    value: int | None = Field(default=None, description="Optional numeric value (e.g., duration seconds)")
    meta_json: dict[str, Any] | None = None


class ActivityRecordResponse(BaseModel):
    user_id: int
    updated_at: datetime
