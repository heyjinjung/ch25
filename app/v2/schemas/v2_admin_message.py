"""V2 admin message and segment batch schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


TargetType = Literal["ALL", "SEGMENT", "USER", "TAG"]


class V2MessageCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    target_type: TargetType
    target_value: str | None = None
    channels: list[str] = Field(default_factory=lambda: ["INBOX"])


class V2MessageResponse(BaseModel):
    id: int
    sender_admin_id: int
    title: str
    content: str
    target_type: TargetType
    target_value: str | None = None
    channels: list[str] | None = None
    recipient_count: int
    read_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class V2SegmentBatchResponse(BaseModel):
    processed: int
    changed: int


# ============================================================================
# Inbox Schemas
# ============================================================================


class V2InboxMessageDto(BaseModel):
    """Individual inbox message for a user."""

    id: int
    message_id: int
    title: str
    content: str
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class V2InboxListResponse(BaseModel):
    """List of inbox messages for a user."""

    messages: list[V2InboxMessageDto]
    unread_count: int


class V2MarkInboxReadRequest(BaseModel):
    """Mark one or more inbox messages as read."""

    inbox_ids: list[int] = Field(default=[], min_length=0)
    mark_all: bool = False


class V2MarkInboxReadResponse(BaseModel):
    """Response after marking messages as read."""

    marked_count: int
    remaining_unread: int
