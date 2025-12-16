"""Admin schemas for segment_rule CRUD."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AdminSegmentRuleResponse(BaseModel):
    id: int
    name: str
    segment: str
    priority: int
    enabled: bool
    condition_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminSegmentRuleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    segment: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Z0-9_]+$")
    priority: int = Field(default=100, ge=0, le=10_000)
    enabled: bool = True
    condition_json: dict[str, Any]


class AdminSegmentRuleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    segment: str | None = Field(default=None, min_length=1, max_length=50, pattern=r"^[A-Z0-9_]+$")
    priority: int | None = Field(default=None, ge=0, le=10_000)
    enabled: bool | None = None
    condition_json: dict[str, Any] | None = None
