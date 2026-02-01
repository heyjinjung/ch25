"""V2 Admin User Summary Schema."""
from __future__ import annotations

from typing import Optional, List, Annotated

from pydantic import ConfigDict, Field, AliasChoices

from app.schemas.base import KstBaseModel as BaseModel


class AdminUserSummary(BaseModel):
    id: int
    cc_id: Annotated[str, Field(validation_alias=AliasChoices("cc_id", "external_id"))]
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
