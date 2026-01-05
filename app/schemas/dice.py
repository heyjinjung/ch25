"""Pydantic schemas for dice APIs."""
from typing import Optional

from app.schemas.base import KstBaseModel as BaseModel

from app.models.feature import FeatureType
from app.schemas.mission import StreakInfoSchema


class DiceStatusResponse(BaseModel):
    config_id: int
    name: str
    max_daily_plays: int
    today_plays: int
    remaining_plays: int
    token_type: str
    token_balance: int
    feature_type: FeatureType
    event_active: bool = False
    event_plays_done: Optional[int] = None
    event_plays_max: Optional[int] = None
    event_ineligible_reason: Optional[str] = None  # "NO_STAKE", "LOW_DEPOSIT", "CAP_REACHED", etc.


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
    vault_earn: int = 0
    streak_info: Optional[StreakInfoSchema] = None
    event_seeded: bool = False  # True if 20k seed was granted on this play
    event_seed_amount: int = 0

