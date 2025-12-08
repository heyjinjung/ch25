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


class RevokeGameTokensRequest(BaseModel):
    user_id: int = Field(gt=0)
    token_type: GameTokenType
    amount: int = Field(gt=0)


class TokenBalance(BaseModel):
    user_id: int
    token_type: GameTokenType
    balance: int


class PlayLogEntry(BaseModel):
    id: int
    user_id: int
    game: str
    reward_type: str
    reward_amount: int
    created_at: str
