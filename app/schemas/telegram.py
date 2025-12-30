from pydantic import BaseModel
from typing import Optional


class TelegramAuthRequest(BaseModel):
    """Payload for Telegram Mini App authentication."""
    init_data: str
    start_param: Optional[str] = None


class TelegramLinkRequest(BaseModel):
    """Payload for linking an existing account to Telegram (inside TMA)."""
    init_data: str


class TelegramManualLinkRequest(BaseModel):
    """Payload for manual credential linking inside TMA."""
    init_data: str
    external_id: str
    password: str


class TelegramBridgeResponse(BaseModel):
    """Bridge link for Telegram."""
    bridge_token: str


class AuthUser(BaseModel):
    id: int
    external_id: str
    nickname: Optional[str] = None
    status: Optional[str] = None
    level: Optional[int] = None
    telegram_id: Optional[int] = None


class TelegramAuthResponse(BaseModel):
    """Response containing JWT and user info after Telegram auth."""
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool
    user: AuthUser
