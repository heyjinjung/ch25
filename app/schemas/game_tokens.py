"""Schemas for game token grants and wallet balances."""
from pydantic import BaseModel, Field

from app.models.game_wallet import GameTokenType


class GrantGameTokensRequest(BaseModel):
    user_id: int = Field(gt=0)
    token_type: GameTokenType
    amount: int = Field(gt=0)


class GrantGameTokensResponse(BaseModel):
    user_id: int
    token_type: GameTokenType
    balance: int
