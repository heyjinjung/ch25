"""Pydantic schemas for dice APIs."""
from pydantic import BaseModel

from app.models.feature import FeatureType


class DiceStatusResponse(BaseModel):
    config_id: int
    name: str
    max_daily_plays: int
    today_plays: int
    remaining_plays: int
    token_type: str
    token_balance: int
    feature_type: FeatureType


class DiceResult(BaseModel):
    user_dice: list[int]
    dealer_dice: list[int]
    user_sum: int
    dealer_sum: int
    outcome: str
    reward_type: str
    reward_amount: int


class DicePlayResponse(BaseModel):
    result: str
    game: DiceResult
    season_pass: dict | None = None
