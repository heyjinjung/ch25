"""Pydantic schemas for external ranking admin APIs."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExternalRankingBase(BaseModel):
    user_id: int
    deposit_amount: int = Field(0, ge=0)
    play_count: int = Field(0, ge=0)
    memo: Optional[str] = None


class ExternalRankingCreate(ExternalRankingBase):
    pass


class ExternalRankingUpdate(BaseModel):
    deposit_amount: Optional[int] = Field(None, ge=0)
    play_count: Optional[int] = Field(None, ge=0)
    memo: Optional[str] = None


class ExternalRankingEntry(BaseModel):
    id: int
    user_id: int
    deposit_amount: int
    play_count: int
    memo: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExternalRankingListResponse(BaseModel):
    items: list[ExternalRankingEntry]
