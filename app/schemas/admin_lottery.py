# /workspace/ch25/app/schemas/admin_lottery.py
from typing import List, Optional
from datetime import datetime

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


class AdminLotteryPrizeBase(BaseModel):
    label: str
    weight: int
    stock: Optional[int] = None
    reward_type: str = Field(
        ...,
        description="보상 타입 (POINT=금고 적립, GAME_XP=시즌 경험치, 티켓/키/기프트콘 등 포함)",
    )
    reward_value: int = Field(..., alias="reward_amount")
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminLotteryConfigBase(BaseModel):
    name: str
    is_active: bool = True
    max_daily_plays: int = Field(1, validation_alias="max_daily_tickets")
    prizes: List[AdminLotteryPrizeBase]

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminLotteryConfigCreate(AdminLotteryConfigBase):
    pass


class AdminLotteryConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_plays: Optional[int] = Field(None, validation_alias="max_daily_tickets")
    prizes: Optional[List[AdminLotteryPrizeBase]] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminLotteryPrizeResponse(AdminLotteryPrizeBase):
    id: int


class AdminLotteryConfigResponse(AdminLotteryConfigBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    prizes: List[AdminLotteryPrizeResponse]
