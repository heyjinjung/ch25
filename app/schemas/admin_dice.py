# /workspace/ch25/app/schemas/admin_dice.py
from typing import Optional
from datetime import datetime

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


class AdminDiceConfigBase(BaseModel):
    name: str
    is_active: bool = True
    max_daily_plays: int
    win_reward_type: str
    win_reward_value: int = Field(..., alias="win_reward_amount")
    draw_reward_type: str
    draw_reward_value: int = Field(..., alias="draw_reward_amount")
    lose_reward_type: str
    lose_reward_value: int = Field(..., alias="lose_reward_amount")

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminDiceConfigCreate(AdminDiceConfigBase):
    pass


class AdminDiceConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_plays: Optional[int] = None
    win_reward_type: Optional[str] = None
    win_reward_value: Optional[int] = None
    draw_reward_type: Optional[str] = None
    draw_reward_value: Optional[int] = None
    lose_reward_type: Optional[str] = None
    lose_reward_value: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AdminDiceConfigResponse(AdminDiceConfigBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
