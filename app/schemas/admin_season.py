# /workspace/ch25/app/schemas/admin_season.py
from datetime import date, datetime
from typing import List, Optional

from pydantic import ConfigDict, Field, validator

from app.schemas.base import KstBaseModel as BaseModel


class AdminSeasonBase(BaseModel):
    name: str = Field(..., alias="season_name")
    start_date: date
    end_date: date
    max_level: int
    base_xp_per_stamp: int
    is_active: bool = True

    @validator("end_date")
    def validate_dates(cls, end_date: date, values: dict) -> date:  # noqa: D417
        start = values.get("start_date")
        if start and end_date < start:
            raise ValueError("end_date must be greater than or equal to start_date")
        return end_date

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminSeasonCreate(AdminSeasonBase):
    pass


class AdminSeasonUpdate(BaseModel):
    name: Optional[str] = Field(None, alias="season_name")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_level: Optional[int] = None
    base_xp_per_stamp: Optional[int] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminSeasonResponse(AdminSeasonBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class AdminSeasonListResponse(BaseModel):
    items: List[AdminSeasonResponse]
    total: int
    page: int
    size: int

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# SeasonPassLevel schemas (for XP requirements and rewards per level)
# ─────────────────────────────────────────────────────────────────────────────

class AdminSeasonLevelBase(BaseModel):
    level: int = Field(..., ge=1)
    required_xp: int = Field(..., ge=0)
    reward_type: str = Field(
        ...,
        min_length=1,
        description="보상 타입 (POINT=금고 적립, GAME_XP=시즌 경험치, 티켓/키/기프트콘 등)",
    )
    reward_amount: int = Field(..., ge=0)
    auto_claim: bool = True

    model_config = ConfigDict(from_attributes=True)


class AdminSeasonLevelCreate(AdminSeasonLevelBase):
    pass


class AdminSeasonLevelUpdate(BaseModel):
    required_xp: Optional[int] = Field(None, ge=0)
    reward_type: Optional[str] = Field(None, min_length=1)
    reward_amount: Optional[int] = Field(None, ge=0)
    auto_claim: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class AdminSeasonLevelResponse(AdminSeasonLevelBase):
    id: int
    season_id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class AdminSeasonLevelListResponse(BaseModel):
    season_id: int
    levels: List[AdminSeasonLevelResponse]
    
    model_config = ConfigDict(from_attributes=True)
