"""Pydantic schemas for new-member dice judgement APIs."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NewMemberDiceStatusResponse(BaseModel):
    eligible: bool
    already_played: bool
    played_at: datetime | None = None
    last_outcome: Literal["WIN", "LOSE"] | None = None
    last_user_dice: int | None = None
    last_dealer_dice: int | None = None
    win_link: str


class NewMemberDicePlayResult(BaseModel):
    user_dice: list[int]
    dealer_dice: list[int]
    outcome: Literal["WIN", "LOSE"]


class NewMemberDicePlayResponse(BaseModel):
    result: str
    game: NewMemberDicePlayResult
    message: str
    win_link: str
