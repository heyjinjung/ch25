"""Pydantic schemas for team battle APIs."""
from datetime import datetime
from typing import Optional
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


class TeamJoinRequest(BaseModel):
    team_id: int


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


class ContributorEntry(BaseModel):
    user_id: int
    points: int


class TeamScoreResponse(BaseModel):
    team_id: int
    season_id: int
    points: int

    class Config:
        from_attributes = True
