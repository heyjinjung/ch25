"""Schemas for admin streak observability metrics."""

from datetime import date, datetime

from pydantic import Field

from app.schemas.base import KstBaseModel as BaseModel


class StreakDailyMetric(BaseModel):
    day: date
    promote: int = 0
    reset: int = 0
    ticket_bonus_grant: int = 0
    vault_bonus_applied: int = 0

    # Optional: vault bonus eligibility diagnostics derived from vault_earn_event.
    vault_base_plays: int = 0
    vault_bonus_applied_via_earn_event: int = 0
    excluded_by_dice_mode: int = 0
    excluded_by_token_type: int = 0


class StreakMetricsResponse(BaseModel):
    days: int = Field(..., ge=1, le=31)
    generated_at: datetime
    timezone: str = "Asia/Seoul"
    calendar_bucket: str = "KST calendar day (DATE(created_at + 9h))"
    operational_reset_hour_kst: int = 9
    streak_trigger: str = "PLAY_GAME"
    notes: list[str] = []
    items: list[StreakDailyMetric]
