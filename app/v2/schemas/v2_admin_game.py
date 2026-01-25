"""V2 admin game configuration schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel

RouletteGrade = Literal["COMMON", "VIP", "WHALE", "AT_RISK"]
# V2 SoT RewardType 확장 + 운영 호환(LEGACY 포함)
RewardType = Literal[
    "POINT",
    "CC_POINT",
    "GAME_XP",
    "DIAMOND",
    "TICKET",
    "BUNDLE",
    "TICKET_BUNDLE",
    "NONE",
    "CREDIT",  # legacy
    "VAULT",   # UI 호환(내부 저장 시 POINT로 정규화)
    # V2 표준 티켓/조각/퍼즐
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "GOLD_KEY_FRAGMENT",
    "DIAMOND_FRAGMENT",
    "PUZZLE_C",
    "PUZZLE_C1",
    "PUZZLE_C2",
    "PUZZLE_J",
    "PUZZLE_M",
    # 기프티콘/인벤토리
    "CHICKEN_GIFTICON_5000",
    "CHICKEN_GIFTICON_10000",
    "STARBUCKS_GIFTICON_2000",
    "STARBUCKS_GIFTICON_10000",
    "PIZZA_GIFTICON_5000",
    "PIZZA_GIFTICON_10000",
    "GOOGLE_GIFTICON_5000",
    "GOOGLE_GIFTICON_10000",
    "BAEMIN_GIFTICON_5000",
    "BAEMIN_GIFTICON_10000",
    "BAEMIN_GIFTICON_20000",
    "COMPOSE_AMERICANO_GIFTICON_3000",
    "GIFTICON_BAEMIN",
    "GIFTICON_COMPOSE",
    "CC_COIN_GIFTICON",
]


class RouletteSegmentDto(BaseModel):
    """룰렛 슬롯 정보 (클라이언트용 DTO)"""
    id: int | None = None
    slot_index: int = Field(..., ge=0, le=7, description="슬롯 인덱스 (0-7)", alias="slotIndex", serialization_alias="slotIndex")
    label: str
    weight: int = Field(..., ge=0, description="가중치 (확률 계산용)")
    reward_type: RewardType = Field(alias="rewardType", serialization_alias="rewardType")
    reward_amount: int = Field(default=0, alias="rewardAmount", serialization_alias="rewardAmount")
    is_jackpot: bool = Field(default=False, alias="isJackpot", serialization_alias="isJackpot")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RouletteConfigDto(BaseModel):
    """룰렛 설정 정보 (클라이언트용 DTO)"""
    id: int
    name: str
    grade: RouletteGrade
    ticket_type: str = Field(alias="ticketType", serialization_alias="ticketType")
    max_daily_spins: int = Field(..., ge=0, description="일일 최대 스핀 횟수 (0=무제한)", alias="maxDailySpins", serialization_alias="maxDailySpins")
    is_active: bool = Field(default=True, alias="isActive", serialization_alias="isActive")
    segments: list[RouletteSegmentDto] = []
    created_at: datetime | None = Field(default=None, alias="createdAt", serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt", serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


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
    slot_index: int = Field(..., ge=0, le=7)
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
    is_active: bool = Field(default=True, alias="isActive", serialization_alias="isActive")
    max_daily_plays: int = Field(..., ge=0, alias="maxDailyPlays", serialization_alias="maxDailyPlays")

    # Probabilities
    win_probability: float = Field(..., ge=0.0, le=1.0, alias="winProbability", serialization_alias="winProbability")
    draw_probability: float = Field(..., ge=0.0, le=1.0, alias="drawProbability", serialization_alias="drawProbability")
    lose_probability: float = Field(..., ge=0.0, le=1.0, alias="loseProbability", serialization_alias="loseProbability")

    # Rewards
    win_reward_type: RewardType = Field(alias="winRewardType", serialization_alias="winRewardType")
    win_reward_amount: int = Field(default=0, alias="winRewardAmount", serialization_alias="winRewardAmount")
    draw_reward_type: RewardType = Field(alias="drawRewardType", serialization_alias="drawRewardType")
    draw_reward_amount: int = Field(default=0, alias="drawRewardAmount", serialization_alias="drawRewardAmount")
    lose_reward_type: RewardType = Field(alias="loseRewardType", serialization_alias="loseRewardType")
    lose_reward_amount: int = Field(default=0, alias="loseRewardAmount", serialization_alias="loseRewardAmount")

    # Daily gain cap
    daily_gain_cap: int = Field(..., ge=0, alias="dailyGainCap", serialization_alias="dailyGainCap")

    # Golden Hour Multiplier Settings
    enable_golden_hour: bool = Field(default=True, alias="enableGoldenHour", serialization_alias="enableGoldenHour")
    golden_hour_multiplier: float = Field(default=2.0, alias="goldenHourMultiplier", serialization_alias="goldenHourMultiplier")

    created_at: datetime | None = Field(default=None, alias="createdAt", serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt", serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DiceConfigUpdateRequest(BaseModel):
    """주사위 설정 수정 요청"""
    name: str | None = None
    is_active: bool | None = None
    max_daily_plays: int | None = Field(None, ge=0)

    # Probabilities
    win_probability: float | None = Field(None, ge=0.0, le=1.0)
    draw_probability: float | None = Field(None, ge=0.0, le=1.0)
    lose_probability: float | None = Field(None, ge=0.0, le=1.0)

    # Rewards
    win_reward_type: RewardType | None = None
    win_reward_amount: int | None = None
    draw_reward_type: RewardType | None = None
    draw_reward_amount: int | None = None
    lose_reward_type: RewardType | None = None
    lose_reward_amount: int | None = None

    # Daily gain cap
    daily_gain_cap: int | None = Field(None, ge=0)

    # Golden Hour Multiplier Settings
    enable_golden_hour: bool | None = None
    golden_hour_multiplier: float | None = None


# Lottery Configuration Schemas
class LotteryPrizeDto(BaseModel):
    """복권 당첨 항목"""
    id: int
    label: str
    weight: int = Field(..., ge=0)
    stock: int | None = None
    reward_type: RewardType = Field(alias="rewardType", serialization_alias="rewardType")
    reward_amount: int = Field(default=0, alias="rewardAmount", serialization_alias="rewardAmount")
    is_active: bool = Field(default=True, alias="isActive", serialization_alias="isActive")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class LotteryConfigDto(BaseModel):
    """복권 게임 설정 정보"""
    id: int
    name: str
    is_active: bool = Field(default=True, alias="isActive", serialization_alias="isActive")
    max_daily_plays: int = Field(..., ge=0, alias="maxDailyPlays", serialization_alias="maxDailyPlays")
    ticket_type: str = Field(alias="ticketType", serialization_alias="ticketType")
    puzzle_piece_probability: float = Field(..., ge=0, le=100, description="퍼즐 조각 드랍 확률 (0-100%)", alias="puzzlePieceProbability", serialization_alias="puzzlePieceProbability")
    prizes: list[LotteryPrizeDto] = []

    created_at: datetime | None = Field(default=None, alias="createdAt", serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt", serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class LotteryConfigUpdateRequest(BaseModel):
    """복권 설정 수정 요청"""
    name: str | None = None
    ticket_type: str | None = None
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
