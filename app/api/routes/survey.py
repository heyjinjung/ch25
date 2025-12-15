"""User-facing survey endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.survey import (
    SurveyCompleteRequest,
    SurveyCompleteResponse,
    SurveyListResponse,
    SurveyResponseUpdateRequest,
    SurveySessionResponse,
)
from app.models.survey import SurveyResponse, SurveyResponseStatus
from app.services.survey_service import SurveyService

router = APIRouter(prefix="/api/surveys", tags=["surveys"])
service = SurveyService()


@router.get("/active", response_model=SurveyListResponse, summary="List active surveys")
def list_active_surveys(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> SurveyListResponse:
    surveys = service.get_active_surveys(db=db, user_id=user_id)
    response_map: dict[int, int | None] = {}
    if surveys:
        survey_ids = [s.id for s in surveys]
        stmt = (
            select(SurveyResponse)
            .where(
                SurveyResponse.survey_id.in_(survey_ids),
                SurveyResponse.user_id == user_id,
                SurveyResponse.status.in_([SurveyResponseStatus.PENDING, SurveyResponseStatus.IN_PROGRESS]),
            )
            .order_by(SurveyResponse.id.desc())
        )
        for resp in db.execute(stmt).scalars().all():
            response_map[resp.survey_id] = resp.id

    items = []
    for s in surveys:
        items.append(
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "channel": s.channel,
                "status": s.status,
                "reward_json": s.reward_json,
                "pending_response_id": response_map.get(s.id),
            }
        )
    return SurveyListResponse(items=items)


@router.post("/{survey_id}/responses", response_model=SurveySessionResponse, summary="Create or restore survey session")
def get_or_create_response(
    survey_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SurveySessionResponse:
    return service.get_survey_session(db=db, survey_id=survey_id, user_id=user_id)


@router.patch(
    "/{survey_id}/responses/{response_id}",
    response_model=SurveySessionResponse,
    summary="Save answers for a survey response",
)
def save_answers(
    survey_id: int,
    response_id: int,
    payload: SurveyResponseUpdateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SurveySessionResponse:
    service.save_answers(
        db=db,
        response_id=response_id,
        user_id=user_id,
        payload=payload.answers,
        last_question_id=payload.last_question_id,
    )
    return service.get_survey_session(db=db, survey_id=survey_id, user_id=user_id)


@router.post(
    "/{survey_id}/responses/{response_id}/complete",
    response_model=SurveyCompleteResponse,
    summary="Complete survey and apply reward",
)
def complete_response(
    survey_id: int,
    response_id: int,
    payload: SurveyCompleteRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SurveyCompleteResponse:
    _ = survey_id
    return service.complete_with_reward(
        db=db,
        response_id=response_id,
        user_id=user_id,
        force_submit=payload.force_submit or False,
    )
