"""V2 game action schemas."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.base import KstBaseModel as BaseModel
from app.schemas.mission import StreakInfoSchema

RewardType = Literal[
    "POINT",
    "CC_POINT",
    "GAME_XP",
    "DIAMOND",
    "TICKET",
    "BUNDLE",
    "TICKET_BUNDLE",
    "NONE",
]

AnimationType = Literal["NORMAL", "SKIP", "DRAMATIC", "FEVER"]
GameResult = Literal["WIN", "LOSE", "DRAW"]


class FeverGauge(BaseModel):
    current: int
    max: int
    is_full: bool


class SeasonPassSnapshot(BaseModel):
    gained_xp: int
    current_level: int
    current_xp: int
    level_up: bool


class GameActionEnvelope(BaseModel):
    result: GameResult
    game_data: dict
    vault_earn: int = 0
    season_pass: Optional[SeasonPassSnapshot] = None
    streak_info: Optional[StreakInfoSchema] = None
    fever_gauge: Optional[FeverGauge] = None
    next_action_available: Optional[list[str]] = None


class RoulettePlayRequestV2(BaseModel):
    ticket_type: str
    bet_multiplier: int = 1


class RouletteSegmentV2(BaseModel):
    id: int
    label: str
    reward_type: RewardType
    reward_amount: int
    slot_index: int
    is_fever_reward: bool = False


class RouletteGameDataV2(BaseModel):
    segment: RouletteSegmentV2
    animation_type: AnimationType = "NORMAL"


class RoulettePlayResponseV2(GameActionEnvelope):
    game_data: RouletteGameDataV2


class DiceRollRequestV2(BaseModel):
    bet_amount: int
    prediction: Optional[str] = None


class DiceGameDataV2(BaseModel):
    user_dice: list[int]
    dealer_dice: list[int]
    user_sum: int
    dealer_sum: int
    outcome: GameResult
    reward_amount: int
    can_double_up: bool = False


class DicePlayResponseV2(GameActionEnvelope):
    game_data: DiceGameDataV2


class DiceDoubleUpRequestV2(BaseModel):
    previous_game_id: str
    choice: str


class DiceDoubleUpResponseV2(BaseModel):
    result: GameResult
    final_amount: int
    is_bust: bool


class LotteryScratchRequestV2(BaseModel):
    ticket_type: str
    selection_numbers: Optional[list[int]] = None


class LotteryPrizeV2(BaseModel):
    id: int
    label: str
    reward_type: RewardType
    reward_amount: int


class LotteryGameDataV2(BaseModel):
    prize: LotteryPrizeV2
    visual_grid: list[list[str]] = Field(default_factory=list)
    collection_piece: Optional[str] = None


class LotteryPlayResponseV2(GameActionEnvelope):
    game_data: LotteryGameDataV2


__all__ = [
    "RewardType",
    "AnimationType",
    "GameResult",
    "FeverGauge",
    "SeasonPassSnapshot",
    "GameActionEnvelope",
    "RoulettePlayRequestV2",
    "RouletteSegmentV2",
    "RouletteGameDataV2",
    "RoulettePlayResponseV2",
    "DiceRollRequestV2",
    "DiceGameDataV2",
    "DicePlayResponseV2",
    "DiceDoubleUpRequestV2",
    "DiceDoubleUpResponseV2",
    "LotteryScratchRequestV2",
    "LotteryPrizeV2",
    "LotteryGameDataV2",
    "LotteryPlayResponseV2",
]
