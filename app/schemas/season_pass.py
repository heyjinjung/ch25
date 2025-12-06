"""Pydantic schemas for season pass APIs."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class SeasonInfo(BaseModel):
    """Season metadata exposed to clients."""

    id: int
    season_name: str
    start_date: date
    end_date: date
    max_level: int
    base_xp_per_stamp: int


class SeasonProgress(BaseModel):
    """User progress snapshot."""

    current_level: int
    current_xp: int
    total_stamps: int
    last_stamp_date: Optional[date] = None


class SeasonLevelInfo(BaseModel):
    """Level requirement and reward details."""

    level: int
    required_xp: int
    reward_type: str
    reward_amount: int
    auto_claim: int


class TodayInfo(BaseModel):
    """Today's stamp status."""

    date: date
    stamped: bool


class RewardInfo(BaseModel):
    """Reward payload returned after level-up or claims."""

    level: int
    reward_type: str
    reward_amount: int
    auto_claim: Optional[int] = None
    claimed_at: Optional[datetime] = None


class SeasonPassStatusResponse(BaseModel):
    """Full season pass status response body."""

    season: SeasonInfo
    progress: SeasonProgress
    levels: list[SeasonLevelInfo]
    today: TodayInfo


class StampRequest(BaseModel):
    """Stamp request payload."""

    source_feature_type: str = Field(..., description="Origin feature type such as ROULETTE or DICE")
    xp_bonus: int = Field(0, description="Additional XP to add on top of base_xp_per_stamp")


class StampResponse(BaseModel):
    """Stamp result payload."""

    added_stamp: int
    xp_added: int
    current_level: int
    leveled_up: bool
    rewards: list[RewardInfo] = Field(default_factory=list)


class ClaimRequest(BaseModel):
    """Reward claim request."""

    level: int


class ClaimResponse(BaseModel):
    """Reward claim response."""

    level: int
    reward_type: str
    reward_amount: int
    claimed_at: datetime


__all__ = [
    "SeasonInfo",
    "SeasonProgress",
    "SeasonLevelInfo",
    "TodayInfo",
    "RewardInfo",
    "SeasonPassStatusResponse",
    "StampRequest",
    "StampResponse",
    "ClaimRequest",
    "ClaimResponse",
]
