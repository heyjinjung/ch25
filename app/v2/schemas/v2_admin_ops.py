"""V2 admin ops schemas."""
from __future__ import annotations

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
