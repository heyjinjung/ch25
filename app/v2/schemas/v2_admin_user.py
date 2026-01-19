"""V2 Admin User CRUD Schema."""
from datetime import datetime
from typing import Optional, List

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


class AdminUserProfileSchema(BaseModel):
    real_name: Optional[str] = None
    phone_number: Optional[str] = None
    telegram_id: Optional[str] = None
    tags: Optional[List[str]] = None
    memo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserBase(BaseModel):
    external_id: str = Field(..., min_length=1, max_length=100)
    nickname: Optional[str] = Field(None, max_length=100)
    level: int = Field(1, ge=1)
    status: str = Field("ACTIVE", max_length=20)
    xp: int = Field(0, ge=0)
    season_level: Optional[int] = Field(1, ge=1)


class AdminUserCreate(AdminUserBase):
    password: Optional[str] = Field(None, min_length=4)
    user_id: Optional[int] = None

    # Telegram Integration
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None


class AdminUserUpdate(BaseModel):
    external_id: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=100)
    level: Optional[int] = Field(None, ge=1)
    xp: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=4)
    season_level: Optional[int] = Field(None, ge=1)
    
    # Telegram Integration
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    
    # CRM Profile update
    admin_profile: Optional[AdminUserProfileSchema] = None

    # Grinder Rule Streak
    login_streak: Optional[int] = None
    last_streak_updated_at: Optional[datetime] = None


class AdminUserResponse(AdminUserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Telegram Integration
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    
    # CRM Data (Nested)
    admin_profile: Optional[AdminUserProfileSchema] = None

    # Grinder Rule Streak
    login_streak: int = 0
    last_streak_updated_at: Optional[datetime] = None

    # Standard user summary (computed)
    summary: Optional["AdminUserSummary"] = None

    model_config = ConfigDict(from_attributes=True)


class InterventionActionDto(BaseModel):
    action_id: str
    label: str
    type: str  # e.g. "REWARD", "MESSAGE", "RESTRICTION"
    description: str


class InterventionPlaybookDto(BaseModel):
    risk_level: str
    suggested_actions: List[InterventionActionDto]


class AdminUserDetailDto(BaseModel):
    id: int
    nickname: str
    telegram_id: Optional[int]
    created_at: datetime
    total_deposit: int
    current_assets: int
    vault_balance: int
    ticket_balance: int
    level: int
    vip_level: str
    is_active: bool
    risk_level: str
    risk_reason: Optional[str] = None
    playbook: Optional[InterventionPlaybookDto] = None


class AdminWalletAdjustmentRequest(BaseModel):
    amount: int = Field(..., description="Amount to change (positive for grant, negative for revoke)")
    token_type: str = Field("VAULT", description="VAULT or specific Token name")
    reason: str = Field(..., min_length=1)


class InterventionExecutionResponse(BaseModel):
    success: bool
    action_id: str
    message: str
    details: Optional[dict] = None


from app.v2.schemas.v2_admin_user_summary import AdminUserSummary  # noqa: E402
