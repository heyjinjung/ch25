"""Schemas for admin dashboard metrics."""
from datetime import datetime
from pydantic import Field

from app.schemas.base import KstBaseModel as BaseModel


class MetricValue(BaseModel):
    value: float | int | None = Field(None, description="Current value for the metric")
    diff_percent: float | None = Field(None, description="Percent change vs previous window")


class DashboardMetricsResponse(BaseModel):
    range_hours: int = Field(..., description="Range window in hours (current period)")
    generated_at: datetime
    active_users: MetricValue
    game_participation: MetricValue
    unique_players: MetricValue
    ticket_usage: MetricValue
    avg_session_time_seconds: MetricValue
