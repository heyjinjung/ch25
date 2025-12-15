"""Pydantic schemas for survey feature."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class SurveyStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"


class SurveyChannel(str, Enum):
    GLOBAL = "GLOBAL"
    SEASON_PASS = "SEASON_PASS"
    ROULETTE = "ROULETTE"
    DICE = "DICE"
    LOTTERY = "LOTTERY"
    TEAM_BATTLE = "TEAM_BATTLE"


class SurveyQuestionType(str, Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTI_CHOICE = "MULTI_CHOICE"
    LIKERT = "LIKERT"
    TEXT = "TEXT"
    NUMBER = "NUMBER"


class SurveySummary(BaseModel):
    id: int
    title: str
    description: str | None = None
    channel: SurveyChannel
    status: SurveyStatus
    reward_json: dict[str, Any] | None = None
    pending_response_id: int | None = Field(default=None, description="Existing response id if in-progress")


class SurveyOptionSchema(BaseModel):
    id: int
    value: str
    label: str
    order_index: int
    weight: int


class SurveyQuestionSchema(BaseModel):
    id: int
    order_index: int
    randomize_group: str | None = None
    question_type: SurveyQuestionType
    title: str
    helper_text: str | None = None
    is_required: bool
    config_json: dict[str, Any] | None = None
    options: list[SurveyOptionSchema] = Field(default_factory=list)


class SurveyDetailResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    channel: SurveyChannel
    status: SurveyStatus
    reward_json: dict[str, Any] | None = None
    questions: list[SurveyQuestionSchema]


class SurveyListResponse(BaseModel):
    items: list[SurveySummary]


class SurveyAnswerPayload(BaseModel):
    question_id: int
    option_id: int | None = None
    answer_text: str | None = None
    answer_number: float | None = None
    meta_json: dict[str, Any] | None = None


class SurveyResponseInfo(BaseModel):
    id: int
    survey_id: int
    status: str
    reward_status: str
    last_question_id: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class SurveySessionResponse(BaseModel):
    response: SurveyResponseInfo
    survey: SurveyDetailResponse
    answers: list[SurveyAnswerPayload] = Field(default_factory=list)


class SurveyResponseUpdateRequest(BaseModel):
    answers: list[SurveyAnswerPayload]
    last_question_id: int | None = None


class SurveyCompleteRequest(BaseModel):
    force_submit: bool | None = Field(default=False, description="Allow submission even if optional answers missing")


class SurveyCompleteResponse(BaseModel):
    response: SurveyResponseInfo
    reward_applied: bool
    toast_message: str | None = None


# Admin schemas
class SurveyQuestionInput(BaseModel):
    title: str
    question_type: SurveyQuestionType
    order_index: int
    is_required: bool = True
    helper_text: str | None = None
    randomize_group: str | None = None
    config_json: dict[str, Any] | None = None
    options: list[dict[str, Any]] = Field(default_factory=list)


class SurveyUpsertRequest(BaseModel):
    title: str
    description: str | None = None
    channel: SurveyChannel = SurveyChannel.GLOBAL
    status: SurveyStatus = SurveyStatus.DRAFT
    reward_json: dict[str, Any] | None = None
    target_segment_json: dict[str, Any] | None = None
    auto_launch: bool = False
    start_at: datetime | None = None
    end_at: datetime | None = None
    questions: list[SurveyQuestionInput] = Field(default_factory=list)


class SurveyAdminResponse(BaseModel):
    id: int
    title: str
    status: SurveyStatus
    channel: SurveyChannel
    created_at: datetime
    updated_at: datetime
    question_count: int


class SurveyAdminListResponse(BaseModel):
    items: list[SurveyAdminResponse]


class SurveyTriggerRuleSchema(BaseModel):
    id: int
    trigger_type: str
    trigger_config_json: dict[str, Any] | None = None
    priority: int
    cooldown_hours: int
    max_per_user: int
    is_active: bool


class SurveyTriggerUpsertRequest(BaseModel):
    trigger_type: str
    trigger_config_json: dict[str, Any] | None = None
    priority: int = 100
    cooldown_hours: int = 24
    max_per_user: int = 1
    is_active: bool = True


class SurveyTriggerListResponse(BaseModel):
    items: list[SurveyTriggerRuleSchema]


__all__ = [
    "SurveyStatus",
    "SurveyChannel",
    "SurveyQuestionType",
    "SurveySummary",
    "SurveyOptionSchema",
    "SurveyQuestionSchema",
    "SurveyDetailResponse",
    "SurveyListResponse",
    "SurveyAnswerPayload",
    "SurveyResponseInfo",
    "SurveySessionResponse",
    "SurveyResponseUpdateRequest",
    "SurveyCompleteRequest",
    "SurveyCompleteResponse",
    "SurveyUpsertRequest",
    "SurveyAdminResponse",
    "SurveyAdminListResponse",
    "SurveyTriggerRuleSchema",
    "SurveyTriggerUpsertRequest",
    "SurveyTriggerListResponse",
]
