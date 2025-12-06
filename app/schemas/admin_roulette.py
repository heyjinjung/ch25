# /workspace/ch25/app/schemas/admin_roulette.py
from typing import List, Optional

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

    @validator("segments")
    def validate_segments(cls, segments: List[AdminRouletteSegmentBase]) -> List[AdminRouletteSegmentBase]:  # noqa: D417
        if len(segments) != 6:
            raise ValueError("segments must include exactly 6 slots")
        return segments

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
    created_at: Optional[str]
    updated_at: Optional[str]
    segments: List[AdminRouletteSegmentResponse]
