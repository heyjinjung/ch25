# /workspace/ch25/app/schemas/admin_ranking.py
from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminRankingEntryBase(BaseModel):
    date: date
    rank: int
    user_id: Optional[int] = None
    user_name: str = Field(..., alias="display_name")
    score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminRankingEntryCreate(AdminRankingEntryBase):
    pass


class AdminRankingEntryUpdate(BaseModel):
    user_id: Optional[int] = None
    user_name: Optional[str] = Field(None, alias="display_name")
    score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminRankingEntryResponse(AdminRankingEntryBase):
    id: int


class AdminRankingListResponse(BaseModel):
    date: date
    items: List[AdminRankingEntryResponse]

    model_config = ConfigDict(from_attributes=True)
