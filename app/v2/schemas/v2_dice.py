"""V2 Pydantic schemas for dice APIs."""
from __future__ import annotations

from typing import Literal, Optional

from app.schemas.base import KstBaseModel as BaseModel

from app.v2.models import FeatureType
from app.schemas.mission import StreakInfoSchema

GameResult = Literal["WIN", "LOSE", "DRAW"]
DiceResult = GameResult


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


class DiceGameData(BaseModel):
    user_dice: list[int]
    dealer_dice: list[int]
    user_sum: int
    dealer_sum: int
    outcome: GameResult
    reward_amount: int
    can_double_up: bool = False


class DicePlayResponse(BaseModel):
    result: GameResult
    game_data: DiceGameData
    season_pass: dict | None = None
    vault_earn: int = 0
    streak_info: Optional[StreakInfoSchema] = None
    event_seeded: bool = False  # True if 20k seed was granted on this play
    event_seed_amount: int = 0

    # Backward-compatible fields
    game: DiceGameData | None = None
