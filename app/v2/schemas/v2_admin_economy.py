"""V2 admin economy schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel

WithdrawalStatus = Literal["PENDING", "APPROVED", "REJECTED"]
DepositStatus = Literal["PENDING", "APPROVED", "REJECTED"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]
AdminProductCategory = Literal[
    "GAME_TICKET",
    "VAULT",
    "PREMIUM",
    "FRAGMENT",
    "PUZZLE",
    "DIAMOND",
    "GIFTICON",
    "SPECIAL",
    "OTHER",
]


class AdminProductDto(BaseModel):
    id: int
    sku: str
    name: str
    # Legacy field (maps to cost_amount for backward compat)
    price: int = 0
    # Exchange model fields
    cost_type: str = Field(default="VAULT", serialization_alias="costType")
    cost_amount: int = Field(default=0, serialization_alias="costAmount")
    reward_type: str = Field(default="", serialization_alias="rewardType")
    reward_amount: int = Field(default=0, serialization_alias="rewardAmount")
    is_visible: bool = Field(
        default=True,
        validation_alias="isVisible",
        serialization_alias="isVisible",
    )
    category: AdminProductCategory = "OTHER"
    sort_order: int = Field(default=0, serialization_alias="sortOrder")
    daily_limit: int | None = Field(default=None, serialization_alias="dailyLimit")
    description: str | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminProductCreateRequest(BaseModel):
    sku: str
    name: str
    cost_type: str = "VAULT"
    cost_amount: int
    reward_type: str
    reward_amount: int
    is_visible: bool = True
    sort_order: int = 0
    daily_limit: int | None = None
    description: str | None = None


class AdminProductUpdateRequest(BaseModel):
    name: str | None = None
    cost_type: str | None = None
    cost_amount: int | None = None
    reward_type: str | None = None
    reward_amount: int | None = None
    is_visible: bool | None = None
    sort_order: int | None = None
    daily_limit: int | None = None
    description: str | None = None


class AdminWithdrawalDto(BaseModel):
    id: int
    userId: int = Field(..., validation_alias="user_id")
    nickname: str
    amount: int
    requestTime: datetime = Field(..., validation_alias="request_time")
    riskLevel: RiskLevel = Field("LOW", validation_alias="risk_level")
    status: WithdrawalStatus

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminDepositDto(BaseModel):
    id: int
    user_id: int
    nickname: str | None = None
    amount: int
    deposit_count: int = 0
    bank_owner: str
    status: DepositStatus
    requested_at: datetime
    is_new: bool = False

    model_config = ConfigDict(from_attributes=True)


class AdminWithdrawalApproveRequest(BaseModel):
    reason: str | None = None


class AdminWithdrawalRejectRequest(BaseModel):
    reason: str


class AdminDepositConfirmRequest(BaseModel):
    pass


class AdminDepositLogDto(BaseModel):
    id: int
    userId: int
    nickname: str | None = None
    amount: int
    kstDate: str  # YYYY-MM-DD
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminDepositCreateRequest(BaseModel):
    user_id: int
    amount: int
    kst_date: str | None = None # Defaults to today if null


class AdminDepositUpdateRequest(BaseModel):
    amount: int | None = None
    kst_date: str | None = None


# Vault Control Schemas
class VaultStatsDto(BaseModel):
    """금고 통계 정보"""
    today_total_vault: int  # 당일 금고 누적 총액
    today_withdrawal_pending: int  # 당일 출금 대기
    today_withdrawal_approved: int  # 당일 출금 승인
    today_withdrawal_rejected: int  # 당일 출금 반려
    total_pending_count: int  # 대기 중인 출금 건수

    model_config = ConfigDict(from_attributes=True)


class UserVaultDto(BaseModel):
    """회원별 금고 정보"""
    user_id: int
    nickname: str
    telegram_username: str | None = None
    vault_balance: int  # 현재 금고 잔액
    total_deposit: int  # 총 입금액
    total_withdrawal: int  # 총 출금액
    last_activity: datetime | None = None
    tier: str = "COMMON"

    model_config = ConfigDict(from_attributes=True)


class VaultLedgerItemDto(BaseModel):
    id: int
    user_id: int
    amount: int
    balance_after: int
    reason: str | None = None
    ref_type: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VaultLedgerResponseDto(BaseModel):
    user_id: int
    nickname: str
    total_in: int
    total_out: int
    net_change: int
    current_balance: int
    items: list[VaultLedgerItemDto]

    model_config = ConfigDict(from_attributes=True)


class VaultDailyTrendDto(BaseModel):
    """일자별 금고 추이"""
    date: str  # YYYY-MM-DD
    total_vault: int  # 해당일 총 금고액
    deposit_count: int  # 입금 건수
    withdrawal_count: int  # 출금 건수
    deposit_amount: int  # 입금액
    withdrawal_amount: int  # 출금액

    model_config = ConfigDict(from_attributes=True)


class VaultForceEditRequest(BaseModel):
    """금고 강제 수정 요청"""
    user_id: int
    amount: int  # 조정할 금액 (양수=증가, 음수=감소)
    reason: str

    model_config = ConfigDict(from_attributes=True)


# 티켓 CRUD
class TicketCreateRequest(BaseModel):
    user_id: int
    ticket_type: str
    amount: int
    reason: str


class TicketUpdateRequest(BaseModel):
    amount: int
    reason: str


# 인벤토리 CRUD
class InventoryItemCreateRequest(BaseModel):
    user_id: int
    item_type: str
    item_name: str
    quantity: int
    reason: str
    expires_at: datetime | None = None


class InventoryItemUpdateRequest(BaseModel):
    quantity: int
    reason: str
    expires_at: datetime | None = None


class TicketStatDto(BaseModel):
    ticketType: str
    currentBalance: int
    totalIssued: int
    totalUsed: int


class UserTicketDto(BaseModel):
    userId: int
    nickname: str
    telegramUsername: str | None = None
    ticketType: str
    currentBalance: int
    totalUsed: int
    lastUsedAt: datetime | None = None


class InventoryStatDto(BaseModel):
    itemType: str
    currentBalance: int
    totalIssued: int
    totalUsed: int


class UserInventoryItemDto(BaseModel):
    userId: int
    nickname: str
    telegramUsername: str | None = None
    itemType: str
    currentQuantity: int
    totalUsed: int
    expiresAt: datetime | None = None
    lastUsedAt: datetime | None = None


class TicketLogDto(BaseModel):
    id: int
    userId: int
    type: str  # GRANT, USE, REVOKE, EXPIRE
    itemType: str
    amount: int
    balanceAfter: int = 0
    reason: str
    timestamp: str

    model_config = ConfigDict(from_attributes=True)
