"""Schemas for Golden V2 intervention endpoints."""
from typing import Any, Optional

from app.schemas.base import KstBaseModel


class V2RetentionInterventionRequest(KstBaseModel):
    event_type: str
    data: dict[str, Any] = {}


class V2RetentionInterventionResponse(KstBaseModel):
    eligible: bool
    experiment_group: Optional[str] = None
    reward_type: Optional[str] = None
    reward_amount: int = 0
    capped_amount: int = 0
    cmax: Optional[int] = None
    predicted_ltv: float = 0
    roi_percent: float = 0
    meta: dict[str, Any] = {}


class V2ReengagementQueueRequest(KstBaseModel):
    reason: Optional[str] = None
    channel: str = "IN_APP"


class V2ReengagementQueueResponse(KstBaseModel):
    queued: bool
    created: bool
    reason: Optional[str] = None
    meta: dict[str, Any] = {}
