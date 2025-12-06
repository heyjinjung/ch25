# /workspace/ch25/app/schemas/admin_season.py
from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, validator


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
    created_at: Optional[str]
    updated_at: Optional[str]


class AdminSeasonListResponse(BaseModel):
    items: List[AdminSeasonResponse]
    total: int
    page: int
    size: int

    model_config = ConfigDict(from_attributes=True)
