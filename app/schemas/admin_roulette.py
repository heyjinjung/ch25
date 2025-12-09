# /workspace/ch25/app/schemas/admin_roulette.py
from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, validator


class AdminRouletteSegmentBase(BaseModel):
    index: int = Field(..., alias="slot_index")
    label: str
    weight: int
    reward_type: str
    reward_value: int = Field(..., alias="reward_amount")
    is_jackpot: bool = False

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)


class AdminRouletteConfigBase(BaseModel):
    name: str
    is_active: bool = True
    max_daily_spins: int
    segments: List[AdminRouletteSegmentBase]

    # 길이 검증은 서비스에서 처리(부족분 패딩/초과분 자름)
    model_config = ConfigDict(from_attributes=True)


class AdminRouletteConfigCreate(AdminRouletteConfigBase):
    pass


class AdminRouletteConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_spins: Optional[int] = None
    segments: Optional[List[AdminRouletteSegmentBase]] = None

    model_config = ConfigDict(from_attributes=True)


class AdminRouletteSegmentResponse(AdminRouletteSegmentBase):
    id: int


class AdminRouletteConfigResponse(AdminRouletteConfigBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    segments: List[AdminRouletteSegmentResponse]
