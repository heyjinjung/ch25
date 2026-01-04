"""Schemas for admin streak reward ops (milestone grants)."""

from __future__ import annotations

from datetime import date, datetime

from app.schemas.base import KstBaseModel


class StreakRewardDailyCountsResponse(KstBaseModel):
    day: date
    grant_day3: int
    grant_day7: int
    skip_day3: int
    skip_day7: int


class StreakRewardUserInfo(KstBaseModel):
    id: int
    external_id: str
    nickname: str | None = None


class StreakRewardUserEvent(KstBaseModel):
    id: int
    user_id: int
    feature_type: str
    event_name: str
    meta_json: dict | None = None
    created_at: datetime


class StreakRewardUserEventsResponse(KstBaseModel):
    user: StreakRewardUserInfo
    items: list[StreakRewardUserEvent]
