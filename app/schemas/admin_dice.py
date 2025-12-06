# /workspace/ch25/app/schemas/admin_dice.py
from typing import Optional

from pydantic import BaseModel


class AdminDiceConfigBase(BaseModel):
    name: str
    is_active: bool = True
    max_daily_plays: int
    win_reward_type: str
    win_reward_value: int
    draw_reward_type: str
    draw_reward_value: int
    lose_reward_type: str
    lose_reward_value: int

    class Config:
        orm_mode = True


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

    class Config:
        orm_mode = True


class AdminDiceConfigResponse(AdminDiceConfigBase):
    id: int
    created_at: Optional[str]
    updated_at: Optional[str]
