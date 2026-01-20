"""V2 admin economy schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel

WithdrawalStatus = Literal["PENDING", "APPROVED", "REJECTED"]
DepositStatus = Literal["PENDING", "APPROVED", "REJECTED"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]
AdminProductCategory = Literal["TICKET", "OTHER"]


class AdminProductDto(BaseModel):
    id: int
    sku: str
    name: str
    price: int
    is_visible: bool = True
    category: AdminProductCategory = "OTHER"

    model_config = ConfigDict(from_attributes=True)


class AdminWithdrawalDto(BaseModel):
    id: int
    user_id: int
    nickname: str
    amount: int
    request_time: datetime
    risk_level: RiskLevel = "LOW"
    status: WithdrawalStatus

    model_config = ConfigDict(from_attributes=True)


class AdminDepositDto(BaseModel):
    id: int
    user_id: int
    amount: int
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
