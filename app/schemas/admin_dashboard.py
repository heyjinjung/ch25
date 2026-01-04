from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class MetricValue(BaseModel):
    value: int | float | None
    diff_percent: float | None = None


class DashboardMetricsResponse(BaseModel):
    range_hours: int
    generated_at: datetime
    active_users: MetricValue
    game_participation: MetricValue
    unique_players: MetricValue
    ticket_usage: MetricValue
    avg_session_time_seconds: MetricValue

class DailyOverviewResponse(BaseModel):
    # Retention Risk
    risk_count: int  # Active yesterday, not today
    streak_risk_count: int  # Streak >= 3, not today

    # Settlement
    mission_percent: float  # Avg completion % yesterday
    vault_payout_ratio: Optional[float]  # Payout / Deposit % (or None if no deposit)

    # Raw values for hovering/details
    total_vault_paid: int
    total_deposit_estimated: int

class EventMetric(BaseModel):
    label: str
    value: str | int | float
    trend: Optional[str] = None  # "UP", "DOWN", "STABLE"
    status: Optional[str] = None # "ON", "OFF"

class EventsStatusResponse(BaseModel):
    welcome_metrics: List[EventMetric]
    streak_counts: Dict[str, int]  # {"NORMAL": 100, "HOT": 20, "LEGEND": 5}
    golden_hour_peak: int
    is_golden_hour_active: bool
