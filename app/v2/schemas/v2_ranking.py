"""V2 Pydantic schemas for ranking API."""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import ConfigDict, Field

from app.v2.schemas.base import KstBaseModel as BaseModel

from app.v2.models import FeatureType


class RankingEntry(BaseModel):
    rank: int
    user_name: str = Field(..., alias="display_name")
    score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ExternalRankingEntry(BaseModel):
    rank: int
    user_id: int
    user_name: Optional[str] = None
    deposit_amount: int
    play_count: int
    memo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RankingTodayResponse(BaseModel):
    date: date
    entries: list[RankingEntry]
    my_entry: RankingEntry | None = None
    external_entries: list[ExternalRankingEntry] = []
    my_external_entry: ExternalRankingEntry | None = None
    feature_type: FeatureType
