"""V2 notification feed schemas."""
from __future__ import annotations

from typing import Literal, Optional, Union

from app.schemas.base import KstBaseModel as BaseModel

FeedType = Literal[
    "JACKPOT_WIN",
    "GUERRILLA_DROP",
    "SYSTEM_NOTICE",
    "USER_ASSET_UPDATE",
]

GameType = Literal["ROULETTE", "DICE", "LOTTERY"]


class JackpotWinPayload(BaseModel):
    nickname: str
    game_type: GameType
    reward_amount: int
    is_mega: bool


class GuerrillaDropPayload(BaseModel):
    game_type: GameType
    event_name: str
    multiplier: float
    duration_sec: int
    message: str


class SystemNoticePayload(BaseModel):
    severity: str
    title: str
    content: str
    link_url: Optional[str] = None


class UserAssetUpdatePayload(BaseModel):
    asset_type: str
    delta: int
    current_balance: int
    reason: str


FeedPayload = Union[
    JackpotWinPayload,
    GuerrillaDropPayload,
    SystemNoticePayload,
    UserAssetUpdatePayload,
]


class FeedEnvelope(BaseModel):
    type: FeedType
    timestamp: int
    id: str
    payload: FeedPayload


__all__ = [
    "FeedType",
    "GameType",
    "JackpotWinPayload",
    "GuerrillaDropPayload",
    "SystemNoticePayload",
    "UserAssetUpdatePayload",
    "FeedPayload",
    "FeedEnvelope",
]
