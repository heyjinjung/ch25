"""V2 ops execution result schemas."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import ConfigDict

from app.v2.schemas.base import KstBaseModel as BaseModel


class OpsExecutionError(BaseModel):
    code: str
    message: str
    details: Optional[str] = None


class OpsExecutionEnvelope(BaseModel):
    kind: Literal[
        "INVENTORY_GRANT_ALL",
        "TARGETED_ITEM_GRANT",
        "TARGETLIST_BROADCAST",
        "GOLDEN_HOUR",
        "MESSAGE_TEMPLATE",
        "SURVEY_DM",
    ]
    timestamp: int
    worker_id: Optional[str] = None
    execution_error: Optional[OpsExecutionError] = None


class OpsGrantedItem(BaseModel):
    item_type: str
    amount: int


class OpsInventoryGrantAll(OpsExecutionEnvelope):
    kind: Literal["INVENTORY_GRANT_ALL"]
    reason: str
    items: List[OpsGrantedItem]
    target: Literal["ALL_USERS"]
    granted_users: int
    async_task_id: Optional[str] = None


class OpsTargetedItemGrant(OpsExecutionEnvelope):
    kind: Literal["TARGETED_ITEM_GRANT"]
    granted_users: int
    items: List[OpsGrantedItem]


class OpsGoldenHourResult(OpsExecutionEnvelope):
    kind: Literal["GOLDEN_HOUR"]
    action: str
    multiplier: float
    enabled: bool
    manual_override: Optional[str] = None
    propagated_to_redis: bool


class V2OpsExecutionResultRecord(BaseModel):
    id: int
    task_id: int
    kind: str
    payload_json: dict

    model_config = ConfigDict(from_attributes=True)
