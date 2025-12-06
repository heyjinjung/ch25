"""Pydantic schemas for ranking API."""
from datetime import date

from pydantic import BaseModel

from app.models.feature import FeatureType


class RankingEntry(BaseModel):
    rank: int
    display_name: str
    score: int

    class Config:
        orm_mode = True


class RankingTodayResponse(BaseModel):
    date: date
    top: list[RankingEntry]
    me: RankingEntry | None = None
    feature_type: FeatureType
