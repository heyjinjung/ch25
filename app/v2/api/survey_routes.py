"""User-facing survey endpoints (V2)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.v2.api.deps import get_current_user_id
from app.schemas.survey import (
    SurveyCompleteRequest,
    SurveyCompleteResponse,
    SurveyListResponse,
    SurveyResponseUpdateRequest,
    SurveySessionResponse,
)
from app.v2.models.v2_survey import V2SurveyResponse, SurveyResponseStatus
from app.v2.services.survey_service import V2SurveyService

router = APIRouter(tags=["v2-surveys"])
service = V2SurveyService()


@router.get("/active", response_model=SurveyListResponse, summary="List active surveys")
def list_active_surveys(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> SurveyListResponse:
    surveys = service.get_active_surveys(db=db, user_id=user_id)
    response_map: dict[int, int | None] = {}
    completed_map: dict[int, bool] = {}
    if surveys:
        survey_ids = [s.id for s in surveys]
        stmt = (
            select(V2SurveyResponse)
            .where(
                V2SurveyResponse.survey_id.in_(survey_ids),
                V2SurveyResponse.user_id == user_id,
            )
            .order_by(V2SurveyResponse.id.desc())
        )
        # Fetch all responses for these surveys (could be multiple per survey if allowed, usually latest matters)
        # Logic: If ANY response is COMPLETED -> is_completed=True
        # If latest is PENDING/IN_PROGRESS -> pending_response_id
        
        # Group by survey_id in python (or relying on order by desc to see latest first)
        seen_pending = set()
        for resp in db.execute(stmt).scalars().all():
            # Check ALL responses for COMPLETED status
            if resp.status == SurveyResponseStatus.COMPLETED:
                completed_map[resp.survey_id] = True
            
            # Map the latest PENDING/IN_PROGRESS response (first one encountered due to desc sort)
            if resp.survey_id not in seen_pending:
                if resp.status in [SurveyResponseStatus.PENDING, SurveyResponseStatus.IN_PROGRESS]:
                    response_map[resp.survey_id] = resp.id
                    seen_pending.add(resp.survey_id)

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
                "is_completed": completed_map.get(s.id, False),
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
