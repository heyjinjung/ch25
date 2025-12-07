"""Pydantic schemas for lottery APIs."""
from pydantic import BaseModel, ConfigDict

from app.models.feature import FeatureType


class LotteryPrizeSchema(BaseModel):
    id: int
    label: str
    reward_type: str
    reward_amount: int

    model_config = ConfigDict(from_attributes=True)


class LotteryStatusResponse(BaseModel):
    config_id: int
    name: str
    max_daily_tickets: int
    today_tickets: int
    remaining_tickets: int
    token_type: str
    token_balance: int
    prize_preview: list[LotteryPrizeSchema]
    feature_type: FeatureType


class LotteryPlayResponse(BaseModel):
    result: str
    prize: LotteryPrizeSchema
    season_pass: dict | None = None
