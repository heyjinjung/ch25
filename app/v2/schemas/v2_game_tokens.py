"""V2 Schemas for game token grants and wallet balances."""
from pydantic import Field

from app.v2.schemas.base import KstBaseModel as BaseModel
from app.v2.schemas.v2_admin_user_summary import AdminUserSummary

from app.v2.models import GameTokenType


class GrantGameTokensRequest(BaseModel):
    user_id: int | None = Field(default=None, gt=0)
    user_identifier: str | None = None
    external_id: str | None = None
    telegram_username: str | None = None
    token_type: GameTokenType
    reason: str | None = None
    amount: int = Field(gt=0)


class GrantGameTokensResponse(BaseModel):
    user_id: int
    external_id: str | None = None
    telegram_username: str | None = None
    nickname: str | None = None
    user: AdminUserSummary | None = None
    token_type: GameTokenType
    balance: int


class RevokeGameTokensRequest(BaseModel):
    user_id: int | None = Field(default=None, gt=0)
    user_identifier: str | None = None
    external_id: str | None = None
    telegram_username: str | None = None
    token_type: GameTokenType
    reason: str | None = None
    amount: int = Field(gt=0)


class TokenBalance(BaseModel):
    user_id: int
    external_id: str | None = None
    telegram_username: str | None = None
    nickname: str | None = None
    user: AdminUserSummary | None = None
    token_type: GameTokenType
    balance: int


class PlayLogEntry(BaseModel):
    id: int
    user_id: int
    external_id: str | None = None
    telegram_username: str | None = None
    nickname: str | None = None
    user: AdminUserSummary | None = None
    game: str
    reward_type: str  # POINT=금고 적립, GAME_XP=시즌 경험치 등
    reward_amount: int
    created_at: str
    reward_label: str | None = None


class LedgerEntry(BaseModel):
    id: int
    user_id: int
    external_id: str | None = None
    telegram_username: str | None = None
    nickname: str | None = None
    user: AdminUserSummary | None = None
    token_type: GameTokenType
    delta: int
    balance_after: int
    reason: str | None = None
    label: str | None = None
    meta_json: dict | None = None
    created_at: str


class UserWalletSummary(BaseModel):
    user_id: int
    external_id: str | None = None
    telegram_username: str | None = None
    nickname: str | None = None
    user: AdminUserSummary | None = None
    balances: dict[str, int]
