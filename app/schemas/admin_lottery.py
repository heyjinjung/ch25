# /workspace/ch25/app/schemas/admin_lottery.py
from typing import List, Optional

from pydantic import BaseModel


class AdminLotteryPrizeBase(BaseModel):
    label: str
    weight: int
    stock: Optional[int] = None
    reward_type: str
    reward_value: int
    is_active: bool = True

    class Config:
        orm_mode = True


class AdminLotteryConfigBase(BaseModel):
    name: str
    is_active: bool = True
    max_daily_plays: int = 1
    prizes: List[AdminLotteryPrizeBase]

    class Config:
        orm_mode = True


class AdminLotteryConfigCreate(AdminLotteryConfigBase):
    pass


class AdminLotteryConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_plays: Optional[int] = None
    prizes: Optional[List[AdminLotteryPrizeBase]] = None

    class Config:
        orm_mode = True


class AdminLotteryPrizeResponse(AdminLotteryPrizeBase):
    id: int


class AdminLotteryConfigResponse(AdminLotteryConfigBase):
    id: int
    created_at: Optional[str]
    updated_at: Optional[str]
    prizes: List[AdminLotteryPrizeResponse]
