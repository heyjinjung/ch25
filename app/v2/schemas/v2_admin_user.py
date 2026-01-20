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
    actionId: str = Field(..., validation_alias="action_id")
    label: str
    type: str  # e.g. "REWARD", "MESSAGE", "RESTRICTION"
    description: str

    model_config = ConfigDict(populate_by_name=True)


class InterventionPlaybookDto(BaseModel):
    riskLevel: str = Field(..., validation_alias="risk_level")
    suggestedActions: List[InterventionActionDto] = Field(
        ..., validation_alias="suggested_actions"
    )

    model_config = ConfigDict(populate_by_name=True)


class AdminUserDetailDto(BaseModel):
    id: int
    nickname: str
    telegramId: Optional[int] = Field(None, validation_alias="telegram_id")
    createdAt: datetime = Field(..., validation_alias="created_at")
    totalDeposit: int = Field(..., validation_alias="total_deposit")
    currentAssets: int = Field(..., validation_alias="current_assets")
    vaultBalance: int = Field(..., validation_alias="vault_balance")
    ticketBalance: int = Field(..., validation_alias="ticket_balance")
    level: int
    vipLevel: str = Field(..., validation_alias="vip_level")
    isActive: bool = Field(..., validation_alias="is_active")
    riskLevel: str = Field(..., validation_alias="risk_level")
    riskReason: Optional[str] = Field(None, validation_alias="risk_reason")
    playbook: Optional[InterventionPlaybookDto] = None

    model_config = ConfigDict(populate_by_name=True)


class AdminWalletAdjustmentRequest(BaseModel):
    amount: int = Field(..., description="Amount to change (positive for grant, negative for revoke)")
    token_type: str = Field("VAULT", description="VAULT or specific Token name")
    reason: str = Field(..., min_length=1)


class InterventionExecutionResponse(BaseModel):
    success: bool
    action_id: str
    message: str
    details: Optional[dict] = None


class AdminUserListDto(BaseModel):
    """User list item for admin table."""
    id: int
    cc_id: Optional[int] = None
    nickname: str
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    tier: str = "COMMON"
    level: int = 1
    vaultBalance: int = 0
    last_active: str
    status: str = "Active"


class UserSearchParams(BaseModel):
    """Search parameters for user list."""
    search: Optional[str] = None
    status: Optional[str] = None
    minLevel: Optional[int] = None
    maxLevel: Optional[int] = None
    sortBy: str = "last_active"
    sortOrder: str = "desc"
    page: int = 1
    limit: int = 20


class UserListResponse(BaseModel):
    """Response for user list with pagination."""
    users: List[AdminUserListDto]
    total: int
    page: int
    limit: int
    totalPages: int


class UserActivityLogDto(BaseModel):
    id: int
    userId: int
    type: str
    description: str
    metadata: dict
    timestamp: datetime


class UserInventoryItemDto(BaseModel):
    id: int
    itemType: str
    itemName: str
    quantity: int
    expiresAt: Optional[datetime] = None
    status: str


class UserNoteDto(BaseModel):
    id: int
    userId: int
    adminId: str
    adminNickname: str
    content: str
    createdAt: datetime


class CreateUserNoteRequest(BaseModel):
    userId: int
    content: str


class UserMissionHistoryDto(BaseModel):
    id: int
    missionId: int
    missionTitle: str
    category: str
    status: str
    progress: int
    maxProgress: int
    completedAt: Optional[datetime] = None
    updatedAt: datetime
    rewardClaimed: bool


class TicketLogDto(BaseModel):
    id: int
    userId: int
    type: str  # "GRANT", "REVOKE", "USE", "EXPIRE"
    itemType: str
    amount: int
    balanceAfter: int
    reason: str
    timestamp: datetime
    adminId: Optional[str] = None
    nickname: Optional[str] = None
    nickname: Optional[str] = None


from app.v2.schemas.v2_admin_user_summary import AdminUserSummary  # noqa: E402
