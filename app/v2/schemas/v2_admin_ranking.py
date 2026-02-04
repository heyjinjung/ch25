"""V2 Admin Ranking Schema."""
from datetime import date
from typing import List, Optional

from pydantic import ConfigDict, Field

from app.v2.schemas.base import KstBaseModel as BaseModel


class AdminRankingEntryBase(BaseModel):
    date: date
    rank: int
    user_id: Optional[int] = None
    user_name: str = Field(..., alias="display_name")
    score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminRankingEntryCreate(AdminRankingEntryBase):
    pass


class AdminRankingEntryUpdate(BaseModel):
    user_id: Optional[int] = None
    user_name: Optional[str] = Field(None, alias="display_name")
    score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminRankingEntryResponse(AdminRankingEntryBase):
    id: int


class AdminRankingListResponse(BaseModel):
    date: date
    items: List[AdminRankingEntryResponse]

    model_config = ConfigDict(from_attributes=True)
