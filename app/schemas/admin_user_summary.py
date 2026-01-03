from __future__ import annotations

from typing import Optional, List

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel


class AdminUserSummary(BaseModel):
    id: int
    external_id: str
    nickname: Optional[str] = None

    tg_id: Optional[int] = None
    tg_username: Optional[str] = None

    real_name: Optional[str] = None
    phone_number: Optional[str] = None

    tags: Optional[List[str]] = None
    memo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserResolveResponse(BaseModel):
    identifier: str
    user: AdminUserSummary
