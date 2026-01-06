# /workspace/ch25/app/schemas/admin_dice.py
from typing import Optional
from datetime import datetime

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


class AdminDiceConfigBase(BaseModel):
    name: str
    is_active: bool = True
    max_daily_plays: int
    win_reward_type: str = Field(
        ...,
        description="보상 타입 (POINT=금고 적립, GAME_XP=시즌 경험치 등)",
    )
    win_reward_value: int = Field(..., alias="win_reward_amount")
    draw_reward_type: str = Field(
        ...,
        description="보상 타입 (POINT=금고 적립, GAME_XP=시즌 경험치 등)",
    )
    draw_reward_value: int = Field(..., alias="draw_reward_amount")
    lose_reward_type: str = Field(
        ...,
        description="보상 타입 (POINT=금고 적립, GAME_XP=시즌 경험치 등)",
    )
    lose_reward_value: int = Field(..., alias="lose_reward_amount")

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminDiceConfigCreate(AdminDiceConfigBase):
    pass


class AdminDiceConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_plays: Optional[int] = None
    win_reward_type: Optional[str] = None
    win_reward_value: Optional[int] = Field(None, alias="win_reward_amount")
    draw_reward_type: Optional[str] = None
    draw_reward_value: Optional[int] = Field(None, alias="draw_reward_amount")
    lose_reward_type: Optional[str] = None
    lose_reward_value: Optional[int] = Field(None, alias="lose_reward_amount")

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminDiceConfigResponse(AdminDiceConfigBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class DiceEventParams(BaseModel):
    is_active: bool
    probability: Optional[dict[str, Optional[dict[str, float]]]] = None
    game_earn_config: Optional[dict[str, Optional[dict[str, int]]]] = None
    caps: Optional[dict[str, Optional[dict[str, int]]]] = None
    eligibility: Optional[dict] = None

