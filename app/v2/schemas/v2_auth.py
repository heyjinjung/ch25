"""V2 Auth/User schemas."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class AuthTokenRequest(BaseModel):
    user_id: int | None = None
    cc_id: str | None = None
    external_id: str | None = None
    password: str | None = None


class AuthUser(BaseModel):
    id: int
    external_id: str
    cc_id: Optional[str] = None
    nickname: Optional[str] = None
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    vault_locked_balance: int = 0


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class UserMeResponse(BaseModel):
    id: int
    external_id: str
    cc_id: Optional[str] = None
    nickname: Optional[str] = None
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None


class UserBalanceResponse(BaseModel):
    vault_locked_balance: int = 0


class LogoutResponse(BaseModel):
    success: bool = True
