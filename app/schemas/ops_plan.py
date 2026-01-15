"""Pydantic schemas for ops plan (campaign/plan/task) APIs."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


# Campaign
class OpsCampaignCreate(BaseModel):
    name: str
    status: str = "DRAFT"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    owner_admin_id: Optional[int] = None
    goal_json: Optional[Dict[str, Any]] = None
    notes_md: Optional[str] = None


class OpsCampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    owner_admin_id: Optional[int] = None
    goal_json: Optional[Dict[str, Any]] = None
    notes_md: Optional[str] = None


class OpsCampaignOut(BaseModel):
    id: int
    name: str
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    owner_admin_id: Optional[int] = None
    goal_json: Optional[Dict[str, Any]] = None
    notes_md: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Plan
class OpsPlanCreate(BaseModel):
    campaign_id: int
    plan_date: date


class OpsPlanUpdate(BaseModel):
    theme_title: Optional[str] = None
    key_message: Optional[str] = None
    status: Optional[str] = None
    closing_summary_md: Optional[str] = None
    kpi_snapshot_json: Optional[Dict[str, Any]] = None


class OpsPlanOut(BaseModel):
    id: int
    campaign_id: int
    plan_date: date
    theme_title: Optional[str] = None
    key_message: Optional[str] = None
    status: str
    closing_summary_md: Optional[str] = None
    kpi_snapshot_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Task
class OpsPlanTaskCreate(BaseModel):
    slot_time: Optional[str] = None
    title: str
    type: str = "NOTE"
    status: str = "TODO"
    memo: Optional[str] = None
    payload_json: Dict[str, Any] = Field(default_factory=dict)


class OpsPlanTaskUpdate(BaseModel):
    slot_time: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    memo: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None


class OpsPlanTaskExecuteRequest(BaseModel):
    status: str = "DONE"


class OpsEvalMetricOut(BaseModel):
    id: int
    plan_id: int
    eval_type: str
    metrics_json: Dict[str, Any]
    grade: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpsPlanTaskOut(BaseModel):
    id: int
    plan_id: int
    slot_time: Optional[str] = None
    title: str
    type: str
    status: str
    memo: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None
    actor_admin_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
