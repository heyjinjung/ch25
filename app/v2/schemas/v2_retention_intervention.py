"""V2 schemas for retention intervention API."""

from __future__ import annotations

from typing import Any, Optional

from app.v2.schemas.base import KstBaseModel


class RetentionInterventionRequest(KstBaseModel):
    event_type: str
    data: dict[str, Any] = {}


class RetentionInterventionResponse(KstBaseModel):
    eligible: bool
    experiment_group: Optional[str] = None
    reward_type: Optional[str] = None
    reward_amount: int = 0
    capped_amount: int = 0
    cmax: Optional[int] = None
    predicted_ltv: float = 0
    roi_percent: float = 0
    meta: dict[str, Any] = {}


class ReengagementQueueRequest(KstBaseModel):
    reason: Optional[str] = None
    channel: str = "IN_APP"


class ReengagementQueueResponse(KstBaseModel):
    queued: bool
    created: bool
    reason: Optional[str] = None
    meta: dict[str, Any] = {}
