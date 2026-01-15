"""Pydantic schemas for ops target list and member APIs.

Based on spec: docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel


# OpsTargetList Schemas
class OpsTargetListCreate(BaseModel):
    """Create a new target list from a scenario or segment."""
    plan_id: int
    name: str
    source_type: str  # SCENARIO, SEGMENT, UPLOAD, MANUAL
    source_params: Optional[Dict[str, Any]] = None


class OpsTargetListUpdate(BaseModel):
    """Update target list properties."""
    name: Optional[str] = None
    is_processed: Optional[bool] = None


class OpsTargetListOut(BaseModel):
    """Target list output schema."""
    id: int
    plan_id: int
    name: str
    source_type: str
    source_params: Optional[Dict[str, Any]] = None
    count_snapshot: int
    is_processed: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# OpsTargetMember Schemas
class OpsTargetMemberCreate(BaseModel):
    """Add a user to a target list."""
    user_id: int
    data: Optional[Dict[str, Any]] = None


class OpsTargetMemberUpdate(BaseModel):
    """Update target member status or data."""
    status: Optional[str] = None  # PENDING, SENT, FAILED
    data: Optional[Dict[str, Any]] = None
    result_status: Optional[str] = None  # NONE, CHECKED
    converted_at: Optional[datetime] = None
    conversion_value: Optional[int] = None


class OpsTargetMemberOut(BaseModel):
    """Target member output schema."""
    id: int
    target_list_id: int
    user_id: int
    nickname: Optional[str] = None
    status: str
    data: Optional[Dict[str, Any]] = None
    result_status: str
    converted_at: Optional[datetime] = None
    conversion_value: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Bulk Import Schemas
class OpsTargetImportRequest(BaseModel):
    """Request to import users from a scenario into a target list."""
    scenario_id: str  # e.g. "SCENARIO_01"
    options: Optional[Dict[str, Any]] = None  # e.g. {"min_deposit": 500000}


class OpsTargetImportResponse(BaseModel):
    """Response after importing users."""
    target_list_id: int
    count: int
    message: str


# Result Check Schemas
class OpsTargetResultCheckRequest(BaseModel):
    """Request to check conversion results for a target list."""
    target_list_id: int


class OpsTargetResultCheckResponse(BaseModel):
    """Response with conversion statistics."""
    target_list_id: int
    total_count: int
    sent_count: int
    converted_count: int
    conversion_rate: float  # e.g. 0.33 for 33%
    total_conversion_value: int


# Crisis Signal Schemas (Dashboard)
class CrisisSignalOut(BaseModel):
    """Single crisis scenario signal for dashboard."""
    id: str  # e.g. "SCENARIO_01"
    name: str  # e.g. "불운한 뉴비"
    count: int
    level: str  # HIGH, MEDIUM, LOW, SPECIAL
    samples: List[str] = []  # Sample nicknames


class CrisisSignalsResponse(BaseModel):
    """All crisis signals for dashboard radar."""
    timestamp: datetime
    signals: List[CrisisSignalOut]


class CrisisDetectionRunRequest(BaseModel):
    """Request to run daily crisis detection."""
    scenario_ids: Optional[List[str]] = None


class CrisisDetectionRunResult(BaseModel):
    """Single crisis detection result."""
    scenario_id: str
    target_list_id: Optional[int] = None
    count: int
    status: str
    message: Optional[str] = None


class CrisisDetectionRunResponse(BaseModel):
    """Response for crisis detection run."""
    plan_id: int
    results: List[CrisisDetectionRunResult]
