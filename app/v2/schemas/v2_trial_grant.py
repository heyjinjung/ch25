"""V2 schemas for trial ticket grants."""

from __future__ import annotations

from app.v2.schemas.base import KstBaseModel as BaseModel
from app.v2.models import GameTokenType


class TrialGrantRequest(BaseModel):
    token_type: GameTokenType


class TrialGrantResponse(BaseModel):
    result: str
    token_type: GameTokenType
    granted: int
    balance: int
    label: str | None = None
