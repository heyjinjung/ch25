"""Pydantic schemas for CC deposit (external ranking) admin APIs.

V2 location (Source of Truth). Legacy import paths should re-export from here.
"""

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel
from app.schemas.admin_user_summary import AdminUserSummary


class CCDepositBase(BaseModel):
    user_id: int | None = None
    cc_id: str | None = Field(default=None, alias="external_id")
    telegram_username: str | None = None
    deposit_amount: int = Field(0, ge=0)
    play_count: int = Field(0, ge=0)
    memo: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CCDepositCreate(CCDepositBase):
    pass


class CCDepositUpdate(BaseModel):
    cc_id: str | None = Field(default=None, alias="external_id")
    telegram_username: str | None = None
    deposit_amount: Optional[int] = Field(None, ge=0)
    play_count: Optional[int] = Field(None, ge=0)
    memo: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CCDepositEntry(BaseModel):
    id: int
    user_id: int
    cc_id: str | None = Field(default=None, alias="external_id")
    telegram_username: str | None = None
    user: AdminUserSummary | None = None
    deposit_amount: int
    play_count: int
    memo: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CCDepositListResponse(BaseModel):
    items: list[CCDepositEntry]


# Backward-compatible aliases
ExternalRankingBase = CCDepositBase
ExternalRankingCreate = CCDepositCreate
ExternalRankingUpdate = CCDepositUpdate
ExternalRankingEntry = CCDepositEntry
ExternalRankingListResponse = CCDepositListResponse
