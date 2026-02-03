"""V2 Admin User CRUD Schema."""
from datetime import datetime
from typing import Optional, List, Annotated

from pydantic import ConfigDict, Field, AliasChoices

from app.schemas.base import KstBaseModel as BaseModel


class AdminUserProfileSchema(BaseModel):
    real_name: Optional[str] = None
    phone_number: Optional[str] = None
    telegram_id: Optional[str] = None
    tags: Optional[List[str]] = None
    memo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserBase(BaseModel):
    cc_id: Annotated[str, Field(min_length=1, max_length=100, validation_alias=AliasChoices("cc_id", "external_id"))]
    nickname: Optional[str] = Field(None, max_length=100)
    level: int = Field(1, ge=1)
    status: str = Field("ACTIVE", max_length=20)
    xp: int = Field(0, ge=0)
    season_level: Optional[int] = Field(1, ge=1)

    model_config = ConfigDict(populate_by_name=True)


class AdminUserCreate(AdminUserBase):
    password: Optional[str] = Field(None, min_length=4)
    user_id: Optional[int] = None

    # Telegram Integration
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None


class AdminUserUpdate(BaseModel):
    cc_id: Optional[Annotated[str, Field(max_length=100, validation_alias=AliasChoices("cc_id", "external_id"))]] = None
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

    model_config = ConfigDict(populate_by_name=True)


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
    force: bool = Field(False, description="Force mode: ignore insufficient balance and set to 0 if needed")


class AdminUserResetRequest(BaseModel):
    """유저 데이터 강제 초기화 요청."""
    reset_level: bool = Field(False, description="Reset level and XP to 0")
    reset_deposit: bool = Field(False, description="Reset total_charge_amount and baseline to 0")
    reset_vault: bool = Field(False, description="Reset vault balances to 0")
    reset_tokens: bool = Field(False, description="Reset all game tokens to 0")
    reason: str = Field(..., min_length=1, description="Admin audit reason")


class AdminUserResetResponse(BaseModel):
    """유저 데이터 초기화 결과."""
    success: bool
    user_id: int
    reset_items: List[str]
    message: str


class InterventionExecutionResponse(BaseModel):
    success: bool
    action_id: str
    message: str
    details: Optional[dict] = None


class AdminUserListDto(BaseModel):
    """User list item for admin table."""
    id: int
    cc_id: Optional[str] = None
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


class AdminUserResolveResponse(BaseModel):
    userId: int
    nickname: str
    externalId: str


class AdminNicknameUpdateRequest(BaseModel):
    """닉네임 수정 요청 스키마."""
    nickname: str = Field(..., min_length=1, max_length=100, description="새 닉네임")


class AdminNicknameUpdateResponse(BaseModel):
    """닉네임 수정 응답 스키마."""
    success: bool
    userId: int
    oldNickname: Optional[str]
    newNickname: str
    message: str


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


class UserMissionProgressUpdateRequest(BaseModel):
    currentValue: int = Field(..., ge=0)


class UserMissionRewardClaimResponse(BaseModel):
    success: bool
    message: str
    rewardType: Optional[str] = None
    rewardAmount: Optional[int] = None


class AdminUserLevelSnapshotDto(BaseModel):
    userId: int
    ccId: str
    level: int
    xp: int
    nextLevel: Optional[int] = None
    nextRequiredXp: Optional[int] = None
    updatedAt: Optional[datetime] = None


class AdminUserLevelAdjustRequest(BaseModel):
    ccId: str = Field(..., min_length=1, max_length=100)
    deltaXp: int = Field(..., description="GAME_XP delta (positive/negative)")
    reason: str = Field(..., min_length=1)


class AdminUserLevelSetRequest(BaseModel):
    ccId: str = Field(..., min_length=1, max_length=100)
    level: Optional[int] = Field(None, ge=1)
    xp: Optional[int] = Field(None, ge=0)
    reason: str = Field(..., min_length=1)


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


# ============ Mission/Streak Admin Schemas ============

class UserMissionProgressAdminDto(BaseModel):
    """유저 미션 진행 현황 (어드민용)"""
    mission_id: int
    title: str
    category: str
    logic_key: str
    current_value: int
    target_value: int
    is_completed: bool
    is_claimed: bool
    approval_status: str
    reset_date: Optional[str] = None
    completed_at: Optional[datetime] = None


class UserMissionsAdminResponse(BaseModel):
    """유저 미션 전체 조회 응답"""
    user_id: int
    total_missions: int
    completed_count: int
    claimed_count: int
    missions: List[UserMissionProgressAdminDto]


class ResetAllMissionsResponse(BaseModel):
    """전체 미션 리셋 응답"""
    success: bool
    user_id: int
    reset_count: int
    message: str


class SetStreakCountRequest(BaseModel):
    """스트릭 일수 설정 요청"""
    streak_days: int = Field(..., ge=0, le=365, description="설정할 스트릭 일수")
    adjust_last_play_date: bool = Field(True, description="last_play_date도 자동 조정할지 여부")


class UserStreakAdminDto(BaseModel):
    """유저 스트릭 상세 정보 (어드민용)"""
    user_id: int
    streak_days: int
    last_play_date: Optional[str] = None
    is_hot: bool
    is_legend: bool
    next_milestone: int
    claimable_day: Optional[int] = None
    current_multiplier: float = 1.0


class MilestoneProgressDto(BaseModel):
    """마일스톤 진행 현황"""
    day: int
    achieved: bool
    claimed: bool
    claim_date: Optional[str] = None
    rewards: Optional[List[dict]] = None


class UserMilestoneProgressResponse(BaseModel):
    """유저 마일스톤 진행 현황 응답"""
    user_id: int
    streak_days: int
    milestones: List[MilestoneProgressDto]


class ForceGrantMilestoneRequest(BaseModel):
    """마일스톤 강제 지급 요청"""
    milestone_day: int = Field(..., ge=1, description="지급할 마일스톤 일수 (3, 7, 14...)")
    reason: str = Field("admin_grant", description="지급 사유")


class ForceGrantMilestoneResponse(BaseModel):
    """마일스톤 강제 지급 응답"""
    success: bool
    user_id: int
    milestone_day: int
    grants: List[dict]
    message: str


class DistributeMilestoneRequest(BaseModel):
    """마일스톤 일괄 배포 요청"""
    milestone_day: int = Field(..., ge=1, description="배포할 마일스톤 일수")
    user_ids: Optional[List[int]] = Field(None, description="대상 유저 ID 목록 (None이면 조건에 맞는 전체)")
    segment: Optional[str] = Field(None, description="특정 세그먼트만 대상")
    reason: str = Field("admin_distribute", description="배포 사유")


class DistributeMilestoneResponse(BaseModel):
    """마일스톤 일괄 배포 응답"""
    success: bool
    milestone_day: int
    total_users: int
    success_count: int
    failed_count: int
    details: List[dict]


from app.v2.schemas.v2_admin_user_summary import AdminUserSummary  # noqa: E402
