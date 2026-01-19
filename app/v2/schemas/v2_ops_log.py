"""V2 Pydantic schemas for ops log APIs."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


class OpsLogCreate(BaseModel):
    date: date
    category: str
    action_code: str
    target_model: str
    target_id: Optional[str] = None
    meta_data: Dict[str, Any] = Field(default_factory=dict)
    ref_id: Optional[str] = None
    is_automated: bool = False


class OpsLogEntryOut(BaseModel):
    id: int
    daily_log_date: date
    timestamp: datetime
    category: str
    action_code: str
    target_model: str
    target_id: Optional[str] = None
    meta_data: Dict[str, Any]
    is_automated: bool
    actor_id: int
    ref_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OpsDailyLogExportResponse(BaseModel):
    filename: str
    content_md: str


class OpsDailyLogUpsert(BaseModel):
    theme_title: Optional[str] = None
    summary_md: Optional[str] = None
    status: Optional[str] = None


class OpsDailyLogOut(BaseModel):
    date: date
    theme_title: Optional[str] = None
    manager_id: Optional[int] = None
    status: str
    summary_md: Optional[str] = None
    kpi_snapshot: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class OpsLogCsvImportError(BaseModel):
    row_number: int
    reason: str


class OpsLogCsvImportResponse(BaseModel):
    total_rows: int
    imported: int
    duplicates: int
    failed: int
    errors: list[OpsLogCsvImportError] = Field(default_factory=list)
