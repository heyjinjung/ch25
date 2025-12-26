"""Schemas for public/admin UI configuration."""

from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.base import KstBaseModel as BaseModel


class UiConfigResponse(BaseModel):
    key: str
    value: dict[str, Any] | None = None
    updated_at: datetime | None = None


class UiConfigUpsertRequest(BaseModel):
    value: dict[str, Any] | None = Field(default=None)
