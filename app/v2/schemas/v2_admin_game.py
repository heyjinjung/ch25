"""V2 admin game configuration schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel

RouletteGrade = Literal["COMMON", "VIP", "WHALE", "AT_RISK"]
RewardType = Literal["POINT", "CREDIT", "TICKET", "NONE"]


class RouletteSegmentDto(BaseModel):
    """룰렛 슬롯 정보 (클라이언트용 DTO)"""
    id: int | None = None
    slot_index: int = Field(..., ge=0, le=5, description="슬롯 인덱스 (0-5)")
    label: str
    weight: int = Field(..., ge=0, description="가중치 (확률 계산용)")
    reward_type: RewardType
    reward_amount: int = 0
    is_jackpot: bool = False

    model_config = ConfigDict(from_attributes=True)


class RouletteConfigDto(BaseModel):
    """룰렛 설정 정보 (클라이언트용 DTO)"""
    id: int
    name: str
    grade: RouletteGrade
    ticket_type: str
    max_daily_spins: int = Field(..., ge=0, description="일일 최대 스핀 횟수 (0=무제한)")
    is_active: bool = True
    segments: list[RouletteSegmentDto] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RouletteConfigCreateRequest(BaseModel):
    """룰렛 설정 생성 요청"""
    name: str
    grade: RouletteGrade
    ticket_type: str
    max_daily_spins: int = Field(default=3, ge=0)
    is_active: bool = True


class RouletteConfigUpdateRequest(BaseModel):
    """룰렛 설정 수정 요청 (부분 업데이트 지원)"""
    name: str | None = None
    ticket_type: str | None = None
    max_daily_spins: int | None = Field(None, ge=0)
    is_active: bool | None = None


class RouletteSegmentUpdateRequest(BaseModel):
    """룰렛 슬롯 수정 요청"""
    slot_index: int = Field(..., ge=0, le=5)
    label: str
    weight: int = Field(..., ge=0)
    reward_type: RewardType
    reward_amount: int = 0
    is_jackpot: bool = False


class RouletteConfigFullUpdateRequest(BaseModel):
    """룰렛 전체 설정 업데이트 (Config + Segments)"""
    name: str | None = None
    ticket_type: str | None = None
    max_daily_spins: int | None = Field(None, ge=0)
    is_active: bool | None = None
    segments: list[RouletteSegmentUpdateRequest] | None = None


# Dice Configuration Schemas
class DiceConfigDto(BaseModel):
    """주사위 게임 설정 정보"""
    id: int
    name: str
    is_active: bool = True
    max_daily_plays: int = Field(..., ge=0)

    # Win/Draw/Lose Rewards
    win_reward_type: RewardType
    win_reward_amount: int = 0
    draw_reward_type: RewardType
    draw_reward_amount: int = 0
    lose_reward_type: RewardType
    lose_reward_amount: int = 0

    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DiceConfigUpdateRequest(BaseModel):
    """주사위 설정 수정 요청"""
    name: str | None = None
    is_active: bool | None = None
    max_daily_plays: int | None = Field(None, ge=0)

    win_reward_type: RewardType | None = None
    win_reward_amount: int | None = None
    draw_reward_type: RewardType | None = None
    draw_reward_amount: int | None = None
    lose_reward_type: RewardType | None = None
    lose_reward_amount: int | None = None


# Lottery Configuration Schemas
class LotteryPrizeDto(BaseModel):
    """복권 당첨 항목"""
    id: int
    label: str
    weight: int = Field(..., ge=0)
    stock: int | None = None
    reward_type: RewardType
    reward_amount: int = 0
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class LotteryConfigDto(BaseModel):
    """복권 게임 설정 정보"""
    id: int
    name: str
    is_active: bool = True
    max_daily_plays: int = Field(..., ge=0)
    puzzle_piece_probability: float = Field(..., ge=0, le=100, description="퍼즐 조각 드랍 확률 (0-100%)")
    prizes: list[LotteryPrizeDto] = []

    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class LotteryConfigUpdateRequest(BaseModel):
    """복권 설정 수정 요청"""
    name: str | None = None
    is_active: bool | None = None
    max_daily_plays: int | None = Field(None, ge=0)
    puzzle_piece_probability: float | None = Field(None, ge=0, le=100)


class LotteryPrizeUpdateRequest(BaseModel):
    """복권 당첨 항목 수정 요청"""
    label: str
    weight: int = Field(..., ge=0)
    stock: int | None = None
    reward_type: RewardType
    reward_amount: int = 0
    is_active: bool = True
