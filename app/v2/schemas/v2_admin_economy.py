"""V2 admin economy schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel

WithdrawalStatus = Literal["PENDING", "APPROVED", "REJECTED"]
DepositStatus = Literal["PENDING", "APPROVED", "REJECTED"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


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
