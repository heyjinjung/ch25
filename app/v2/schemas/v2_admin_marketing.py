"""V2 admin marketing (message/survey) schemas.

- Purpose: Minimal DTOs for V2 Admin UI marketing pages.
- Note: All datetime values are serialized in KST via KstBaseModel.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.v2.schemas.base import KstBaseModel as BaseModel


SurveyQuestionUiType = Literal["SINGLE", "MULTIPLE", "TEXT"]


class V2AdminSurveyQuestionDto(BaseModel):
    id: int
    type: SurveyQuestionUiType
    question: str
    options: list[str] | None = None


class V2AdminSurveyDto(BaseModel):
    id: int
    title: str
    description: str | None = None
    questions: list[V2AdminSurveyQuestionDto] = Field(default_factory=list)
    is_active: bool
    response_count: int
    created_at: datetime


class V2AdminSurveyResultOptionDto(BaseModel):
    option: str
    count: int
    percentage: int


class V2AdminSurveyResultDto(BaseModel):
    survey_id: int
    question_id: int
    question: str
    responses: list[V2AdminSurveyResultOptionDto] = Field(default_factory=list)


class V2AdminSurveyToggleRequest(BaseModel):
    is_active: bool
