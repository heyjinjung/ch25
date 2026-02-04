"""Pydantic schemas for dice APIs (V2 aligned)."""
from __future__ import annotations

from typing import Literal, Optional

from app.v2.schemas.base import KstBaseModel as BaseModel

from app.models.feature import FeatureType
from app.schemas.mission import StreakInfoSchema

GameResult = Literal["WIN", "LOSE", "DRAW"]
DiceResult = GameResult


class DicePlayRequest(BaseModel):
    bet_amount: int = 1
    prediction: Optional[str] = None


class DiceRewardConfig(BaseModel):
    win_reward_type: str
    win_reward_amount: int
    draw_reward_type: str
    draw_reward_amount: int
    lose_reward_type: str
    lose_reward_amount: int


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
    reward_config: Optional[DiceRewardConfig] = None
    is_golden_hour: bool = False



class DiceGameData(BaseModel):
    user_dice: list[int]
    dealer_dice: list[int]
    user_sum: int
    dealer_sum: int
    outcome: GameResult
    reward_amount: int
    can_double_up: bool = False


class DicePlayResponse(BaseModel):
    result: str
    game_data: DiceGameData
    season_pass: dict | None = None
    vault_earn: int = 0
    streak_info: Optional[StreakInfoSchema] = None
    event_seeded: bool = False  # True if 20k seed was granted on this play
    event_seed_amount: int = 0
    is_golden_hour: bool = False


    # Backward-compatible fields
    game: DiceGameData | None = None

