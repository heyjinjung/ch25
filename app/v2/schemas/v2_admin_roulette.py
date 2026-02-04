"""V2 Admin Roulette Schema."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import ConfigDict, Field, field_validator

from app.v2.models import GameTokenType
from app.v2.schemas.base import KstBaseModel as BaseModel


ALLOWED_ROULETTE_TICKET_TYPES = {
    GameTokenType.ROULETTE_COIN.value,
    GameTokenType.TRIAL_TOKEN.value,
    GameTokenType.GOLD_KEY.value,
    GameTokenType.DIAMOND_KEY.value,
}


class AdminRouletteSegmentBase(BaseModel):
    # Accept both `index` and `slot_index` via alias.
    index: int = Field(..., alias="slot_index")
    label: str
    weight: int
    reward_type: str = Field(
        ...,
        description="보상 타입 (POINT=금고 적립, GAME_XP=시즌 경험치, 티켓/키/기프트콘 등 포함)",
    )
    reward_value: int = Field(..., alias="reward_amount")
    is_jackpot: bool = False

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminRouletteConfigBase(BaseModel):
    name: str
    ticket_type: str = GameTokenType.ROULETTE_COIN.value
    is_active: bool = True
    max_daily_spins: int
    grade: str = "COMMON"
    segments: List[AdminRouletteSegmentBase] = Field(default_factory=list)

    @field_validator("ticket_type")
    @classmethod
    def validate_ticket_type(cls, value: str) -> str:
        if value not in ALLOWED_ROULETTE_TICKET_TYPES:
            raise ValueError("invalid ticket_type")
        return value

    model_config = ConfigDict(from_attributes=True)


class AdminRouletteConfigCreate(AdminRouletteConfigBase):
    pass


class AdminRouletteConfigUpdate(BaseModel):
    name: Optional[str] = None
    ticket_type: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_spins: Optional[int] = None
    grade: Optional[str] = None
    segments: Optional[List[AdminRouletteSegmentBase]] = None

    @field_validator("ticket_type")
    @classmethod
    def validate_ticket_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in ALLOWED_ROULETTE_TICKET_TYPES:
            raise ValueError("invalid ticket_type")
        return value

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminRouletteSegmentResponse(AdminRouletteSegmentBase):
    id: int


class AdminRouletteConfigResponse(AdminRouletteConfigBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    segments: List[AdminRouletteSegmentResponse]
