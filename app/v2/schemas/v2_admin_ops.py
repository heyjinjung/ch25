"""V2 admin ops schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel

SystemStatus = Literal["OK", "DEGRADED", "ERROR"]


class OpsSystemStatusDto(BaseModel):
    db: SystemStatus = "OK"
    redis: SystemStatus = "OK"
    worker: SystemStatus = "OK"


class OpsRiskUserDto(BaseModel):
    user_id: int
    nickname: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    risk_reason: str | None = None
    churn_score: float


class OpsGoldenRadarDto(BaseModel):
    high_rollers: int = 0
    churn_risks: int = 0
    online_now: int = 0
    risk_users: list[OpsRiskUserDto] = []


class OpsMetricsDto(BaseModel):
    today_revenue: int = 0
    active_users_24h: int = 0


class OpsDashboardResponse(BaseModel):
    system: OpsSystemStatusDto
    golden_radar: OpsGoldenRadarDto
    metrics: OpsMetricsDto

    model_config = ConfigDict(from_attributes=True)


class InterventionLogDto(BaseModel):
    """Golden intervention log entry."""

    id: int
    user_id: int
    trigger_id: str
    trigger_condition: str | None = None
    action_taken: str
    user_balance_before: float | None = None
    session_balance_delta: float | None = None
    recent_results: str | None = None
    cooldown_expires_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoldenGameEventDto(BaseModel):
    """Real-time Golden game event for WebSocket streaming."""

    event_id: str
    user_id: int
    timestamp: str
    source: str
    game_type: str
    result: str
    bet_amount: float
    payout_amount: float
    current_balance: float
    external_user_id: str | None = None
    session_id: str | None = None
    game_metadata: dict | None = None
    is_historical: bool = False
