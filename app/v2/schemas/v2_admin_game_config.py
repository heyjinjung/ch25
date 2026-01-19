"""V2 admin game config schemas."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import ConfigDict, Field, field_validator, model_validator

from app.schemas.base import KstBaseModel as BaseModel

TicketType = Literal[
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "LOTTERY_TICKET",
    "TRIAL_TICKET",
]

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


class AdminRouletteSegmentV2(BaseModel):
    slot_index: int
    label: str
    weight: int
    reward_type: RewardType
    reward_amount: int
    is_jackpot: bool = False

    @field_validator("slot_index")
    @classmethod
    def validate_slot_index(cls, value: int) -> int:
        if value < 0 or value > 5:
            raise ValueError("slot_index must be between 0 and 5")
        return value

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, value: int) -> int:
        if value < 0:
            raise ValueError("weight must be >= 0")
        return value


class AdminRouletteConfigV2(BaseModel):
    name: str
    ticket_type: TicketType = "ROULETTE_TICKET"
    is_active: bool = True
    max_daily_spins: int
    grade: Optional[str] = "COMMON"
    segments: List[AdminRouletteSegmentV2] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AdminDiceConfigV2(BaseModel):
    name: str
    ticket_type: TicketType = "DICE_TICKET"
    is_active: bool = True
    max_daily_plays: int
    win_reward_type: RewardType
    win_reward_amount: int
    draw_reward_type: RewardType
    draw_reward_amount: int
    lose_reward_type: RewardType
    lose_reward_amount: int

    @field_validator("max_daily_plays")
    @classmethod
    def validate_max_daily_plays(cls, value: int) -> int:
        if value < 0:
            raise ValueError("max_daily_plays must be >= 0")
        return value


class AdminLotteryPrizeV2(BaseModel):
    label: str
    weight: int
    stock: Optional[int] = None
    reward_type: RewardType
    reward_amount: int
    is_active: bool = True

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, value: int) -> int:
        if value < 0:
            raise ValueError("weight must be >= 0")
        return value

    @field_validator("stock")
    @classmethod
    def validate_stock(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value < 0:
            raise ValueError("stock must be >= 0")
        return value


class AdminLotteryConfigV2(BaseModel):
    name: str
    ticket_type: TicketType = "LOTTERY_TICKET"
    is_active: bool = True
    max_daily_plays: int
    prizes: List[AdminLotteryPrizeV2]

    @model_validator(mode="after")
    def validate_prizes(self):
        labels = [prize.label for prize in self.prizes]
        if len(labels) != len(set(labels)):
            raise ValueError("lottery prize label must be unique")
        active_weight = sum(
            prize.weight for prize in self.prizes if prize.is_active and prize.weight > 0
        )
        if active_weight <= 0:
            raise ValueError("at least one active prize with weight > 0 is required")
        return self


class DiceEventParams(BaseModel):
    is_active: bool
    probability: Optional[dict[str, Optional[dict[str, float]]]] = None
    game_earn_config: Optional[dict[str, Optional[dict[str, int]]]] = None
    caps: Optional[dict[str, Optional[dict[str, int]]]] = None
    eligibility: Optional[dict] = None


class AdminDiceConfigCreate(AdminDiceConfigV2):
    pass


class AdminDiceConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_plays: Optional[int] = None
    win_reward_type: Optional[RewardType] = None
    win_reward_amount: Optional[int] = None
    draw_reward_type: Optional[RewardType] = None
    draw_reward_amount: Optional[int] = None
    lose_reward_type: Optional[RewardType] = None
    lose_reward_amount: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


__all__ = [
    "TicketType",
    "RewardType",
    "AdminRouletteSegmentV2",
    "AdminRouletteConfigV2",
    "AdminDiceConfigV2",
    "AdminDiceConfigCreate",
    "AdminDiceConfigUpdate",
    "DiceEventParams",
    "AdminLotteryPrizeV2",
    "AdminLotteryConfigV2",
]
