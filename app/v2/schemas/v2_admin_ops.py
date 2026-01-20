"""V2 admin ops schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel

SystemStatus = Literal["OK", "DEGRADED", "ERROR"]


class OpsSystemStatusDto(BaseModel):
    db: SystemStatus = "OK"
    redis: SystemStatus = "OK"
    worker: SystemStatus = "OK"


class OpsRiskUserDto(BaseModel):
    user_id: int = Field(alias="userId", serialization_alias="userId")
    nickname: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = Field(alias="riskLevel", serialization_alias="riskLevel")
    risk_reason: str | None = Field(default=None, alias="riskReason", serialization_alias="riskReason")
    churn_score: float = Field(alias="churnScore", serialization_alias="churnScore")

    model_config = ConfigDict(populate_by_name=True)


class OpsGoldenRadarDto(BaseModel):
    high_rollers: int = Field(default=0, alias="highRollers", serialization_alias="highRollers")
    churn_risks: int = Field(default=0, alias="churnRisks", serialization_alias="churnRisks")
    online_now: int = Field(default=0, alias="onlineNow", serialization_alias="onlineNow")
    risk_users: list[OpsRiskUserDto] = Field(default=[], alias="riskUsers", serialization_alias="riskUsers")

    model_config = ConfigDict(populate_by_name=True)


class OpsMetricsDto(BaseModel):
    today_revenue: int = Field(default=0, alias="todayRevenue", serialization_alias="todayRevenue")
    active_users_24h: int = Field(default=0, alias="activeUsers24h", serialization_alias="activeUsers24h")

    model_config = ConfigDict(populate_by_name=True)


class OpsDashboardResponse(BaseModel):
    system: OpsSystemStatusDto
    golden_radar: OpsGoldenRadarDto = Field(alias="goldenRadar", serialization_alias="goldenRadar")
    metrics: OpsMetricsDto

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


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
