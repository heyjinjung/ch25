# /workspace/ch25/app/schemas/admin_roulette.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import ConfigDict, Field, validator

from app.models.game_wallet import GameTokenType
from app.schemas.base import KstBaseModel as BaseModel


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
    reward_type: str
    reward_value: int = Field(..., alias="reward_amount")
    is_jackpot: bool = False

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminRouletteConfigBase(BaseModel):
    name: str
    ticket_type: str = GameTokenType.ROULETTE_COIN.value
    is_active: bool = True
    max_daily_spins: int
    segments: List[AdminRouletteSegmentBase] = Field(default_factory=list)

    @validator("ticket_type")
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
    segments: Optional[List[AdminRouletteSegmentBase]] = None

    @validator("ticket_type")
    def validate_ticket_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in ALLOWED_ROULETTE_TICKET_TYPES:
            raise ValueError("invalid ticket_type")
        return value

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminRouletteSegmentResponse(AdminRouletteSegmentBase):
    id: int


class AdminRouletteConfigResponse(AdminRouletteConfigBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    segments: List[AdminRouletteSegmentResponse]

