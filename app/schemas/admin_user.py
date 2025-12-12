"""Admin user CRUD schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminUserBase(BaseModel):
    external_id: str = Field(..., min_length=1, max_length=100)
    nickname: Optional[str] = Field(None, max_length=100)
    level: int = Field(1, ge=1)
    xp: int = Field(0, ge=0)
    status: str = Field("ACTIVE", max_length=20)


class AdminUserCreate(AdminUserBase):
    password: Optional[str] = Field(None, min_length=4)
    user_id: Optional[int] = None


class AdminUserUpdate(BaseModel):
    external_id: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=100)
    level: Optional[int] = Field(None, ge=1)
    xp: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=4)


class AdminUserResponse(AdminUserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
