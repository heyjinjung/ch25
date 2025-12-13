"""Pydantic schemas for team battle APIs."""
from datetime import datetime
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field


class TeamSeasonBase(BaseModel):
    name: str
    starts_at: datetime
    ends_at: datetime
    is_active: bool = False
    rewards_schema: Optional[dict] = None


class TeamSeasonCreate(TeamSeasonBase):
    pass


class TeamSeasonResponse(TeamSeasonBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamSeasonUpdate(BaseModel):
    name: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    rewards_schema: Optional[dict] = None


class TeamBase(BaseModel):
    name: str
    icon: Optional[str] = None


class TeamCreate(TeamBase):
    pass


class TeamResponse(TeamBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class TeamJoinRequest(BaseModel):
    team_id: int


class TeamForceJoinRequest(BaseModel):
    team_id: int
    user_id: int


class TeamMembershipResponse(BaseModel):
    team_id: int
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamPointsRequest(BaseModel):
    team_id: int
    delta: int = Field(..., description="Points to add (positive or negative)")
    action: str = Field(..., description="Source action code")
    user_id: Optional[int] = Field(None, description="Attribution user id")
    season_id: Optional[int] = None
    meta: Optional[dict] = None


class LeaderboardEntry(BaseModel):
    team_id: int
    team_name: str
    points: int
    member_count: int = 0
    latest_event_at: datetime | None = None


class ContributorEntry(BaseModel):
    user_id: int
    points: int
    latest_event_at: datetime | None = None


class TeamScoreResponse(BaseModel):
    team_id: int
    season_id: int
    points: int

    class Config:
        from_attributes = True


class TeamAutoBalanceRequest(BaseModel):
    target_date: Optional[date] = Field(None, description="기준 일자 (KST). 비우면 어제")
    season_id: Optional[int] = None
    apply: bool = Field(False, description="True면 즉시 팀 배정 반영")
    weight_deposit: float = Field(0.6, ge=0, le=1)
    weight_play: float = Field(0.4, ge=0, le=1)


class TeamAutoBalanceResponse(BaseModel):
    season_id: int
    target_date: str
    teams: list[int]
    totals: list[float]
    team1_count: int
    team2_count: int

    class Config:
        from_attributes = True
