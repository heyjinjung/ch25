"""Pydantic schemas for lottery APIs."""
from pydantic import ConfigDict
from typing import Optional

from app.v2.schemas.base import KstBaseModel as BaseModel

from app.v2.models.core.feature import FeatureType
from app.v2.schemas.shared.mission import StreakInfoSchema


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
    collection_progress: Optional[dict] = None  # { "C": 2, "J": 1, "M": 0 }


class LotteryPlayResponse(BaseModel):
    result: str
    prize: LotteryPrizeSchema
    season_pass: dict | None = None
    vault_earn: int = 0
    streak_info: Optional[StreakInfoSchema] = None
    game_data: Optional[dict] = None  # Added for schema compliance (collection_piece)
