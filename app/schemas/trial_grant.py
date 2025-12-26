"""Schemas for trial ticket grants."""

from app.schemas.base import KstBaseModel as BaseModel
from app.models.game_wallet import GameTokenType


class TrialGrantRequest(BaseModel):
    token_type: GameTokenType


class TrialGrantResponse(BaseModel):
    result: str
    token_type: GameTokenType
    granted: int
    balance: int
    label: str | None = None
