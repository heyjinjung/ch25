"""Pydantic schemas for roulette APIs."""
from pydantic import BaseModel

from app.models.feature import FeatureType


class RouletteSegmentSchema(BaseModel):
    id: int
    label: str
    reward_type: str
    reward_amount: int
    slot_index: int

    class Config:
        orm_mode = True


class RouletteStatusResponse(BaseModel):
    config_id: int
    name: str
    max_daily_spins: int
    today_spins: int
    remaining_spins: int
    segments: list[RouletteSegmentSchema]
    feature_type: FeatureType


class RoulettePlayResponse(BaseModel):
    result: str
    segment: RouletteSegmentSchema
    season_pass: dict | None = None
