"""V2 admin ops schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.v2.schemas.base import KstBaseModel as BaseModel

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
    avg_churn_score: float | None = Field(default=None, alias="avgChurnScore", serialization_alias="avgChurnScore")
    radar_accuracy: float | None = Field(default=None, alias="radarAccuracy", serialization_alias="radarAccuracy")
    interventions_today: int | None = Field(default=None, alias="interventionsToday", serialization_alias="interventionsToday")
    intervention_success_rate: float | None = Field(default=None, alias="interventionSuccessRate", serialization_alias="interventionSuccessRate")
    risk_users: list[OpsRiskUserDto] = Field(default=[], alias="riskUsers", serialization_alias="riskUsers")

    model_config = ConfigDict(populate_by_name=True)


class OpsMetricsDto(BaseModel):
    today_revenue: int = Field(default=0, alias="todayRevenue", serialization_alias="todayRevenue")
    active_users_24h: int = Field(default=0, alias="activeUsers24h", serialization_alias="activeUsers24h")

    model_config = ConfigDict(populate_by_name=True)


class OpsHQMarginStatsDto(BaseModel):
    vip_count: int = Field(default=0, alias="vipCount", serialization_alias="vipCount")
    whale_count: int = Field(default=0, alias="whaleCount", serialization_alias="whaleCount")
    at_risk_count: int = Field(default=0, alias="atRiskCount", serialization_alias="atRiskCount")
    prospective_vip_count: int = Field(default=0, alias="prospectiveVipCount", serialization_alias="prospectiveVipCount")
    last_sync_at: datetime | None = Field(default=None, alias="lastSyncAt", serialization_alias="lastSyncAt")

    model_config = ConfigDict(populate_by_name=True)


class RevenueStatsDto(BaseModel):
    """HQ Margin + Game Log 통합 수익 통계."""
    today_revenue: int = Field(default=0, alias="todayRevenue", serialization_alias="todayRevenue")
    today_expenses: int = Field(default=0, alias="todayExpenses", serialization_alias="todayExpenses")
    net_income: int = Field(default=0, alias="netIncome", serialization_alias="netIncome")
    deposit_count: int = Field(default=0, alias="depositCount", serialization_alias="depositCount")
    weekly_growth_rate: float = Field(default=0.0, alias="weeklyGrowthRate", serialization_alias="weeklyGrowthRate")
    total_charge: int = Field(default=0, alias="totalCharge", serialization_alias="totalCharge")
    data_source: str = Field(default="GAME_LOG", alias="dataSource", serialization_alias="dataSource")

    model_config = ConfigDict(populate_by_name=True)


class DetailedRiskUserDto(BaseModel):
    """상세 위험 유저 정보."""
    user_id: int = Field(alias="userId", serialization_alias="userId")
    nickname: str
    risk_type: str = Field(alias="riskType", serialization_alias="riskType")  # LOSS_STREAK | INACTIVE | BALANCE_DROP
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(alias="riskLevel", serialization_alias="riskLevel")
    risk_score: float = Field(alias="riskScore", serialization_alias="riskScore")
    details: dict = Field(default_factory=dict)
    last_activity_at: datetime | None = Field(default=None, alias="lastActivityAt", serialization_alias="lastActivityAt")

    model_config = ConfigDict(populate_by_name=True)


class OpportunityUserDto(BaseModel):
    """기회 유저 상세 정보."""
    user_id: int = Field(alias="userId", serialization_alias="userId")
    nickname: str
    segment: str  # VIP | WHALE
    total_margin: int = Field(default=0, alias="totalMargin", serialization_alias="totalMargin")
    total_charge: int = Field(default=0, alias="totalCharge", serialization_alias="totalCharge")
    last_activity_at: datetime | None = Field(default=None, alias="lastActivityAt", serialization_alias="lastActivityAt")

    model_config = ConfigDict(populate_by_name=True)


class OpsDashboardResponse(BaseModel):
    system: OpsSystemStatusDto
    golden_radar: OpsGoldenRadarDto = Field(alias="goldenRadar", serialization_alias="goldenRadar")
    metrics: OpsMetricsDto
    hq_stats: OpsHQMarginStatsDto | None = Field(default=None, alias="hqStats", serialization_alias="hqStats")
    
    # CSV 데이터 기반 확장 필드
    revenue_stats: RevenueStatsDto | None = Field(default=None, alias="revenueStats", serialization_alias="revenueStats")
    risk_users: list[DetailedRiskUserDto] = Field(default_factory=list, alias="riskUsers", serialization_alias="riskUsers")
    opportunity_users: list[OpportunityUserDto] = Field(default_factory=list, alias="opportunityUsers", serialization_alias="opportunityUsers")

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
