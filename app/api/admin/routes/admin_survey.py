"""Admin endpoints for survey management."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_db
from app.models.survey import Survey, SurveyOption, SurveyQuestion, SurveyStatus, SurveyTriggerRule
from app.schemas.survey import (
    SurveyAdminListResponse,
    SurveyAdminResponse,
    SurveyDetailResponse,
    SurveyQuestionSchema,
    SurveyTriggerListResponse,
    SurveyTriggerRuleSchema,
    SurveyTriggerUpsertRequest,
    SurveyUpsertRequest,
)

router = APIRouter(prefix="/admin/api/surveys", tags=["admin-surveys"])


def _serialize_detail(survey: Survey) -> SurveyDetailResponse:
    return SurveyDetailResponse(
        id=survey.id,
        title=survey.title,
        description=survey.description,
        channel=survey.channel,
        status=survey.status,
        reward_json=survey.reward_json,
        questions=[
            SurveyQuestionSchema(
                id=q.id,
                order_index=q.order_index,
                randomize_group=q.randomize_group,
                question_type=q.question_type,
                title=q.title,
                helper_text=q.helper_text,
                is_required=q.is_required,
                config_json=q.config_json,
                options=[
                    {
                        "id": opt.id,
                        "value": opt.value,
                        "label": opt.label,
                        "order_index": opt.order_index,
                        "weight": opt.weight,
                    }
                    for opt in sorted(q.options, key=lambda o: o.order_index)
                ],
            )
            for q in sorted(survey.questions, key=lambda q: q.order_index)
        ],
    )


def _replace_questions(db: Session, survey: Survey, payload: SurveyUpsertRequest) -> None:
    survey.questions.clear()
    db.flush()
    for q in payload.questions:
        question = SurveyQuestion(
            survey_id=survey.id,
            order_index=q.order_index,
            randomize_group=q.randomize_group,
            question_type=q.question_type,
            title=q.title,
            helper_text=q.helper_text,
            is_required=q.is_required,
            config_json=q.config_json,
        )
        db.add(question)
        db.flush()
        for idx, opt in enumerate(q.options):
            db.add(
                SurveyOption(
                    question_id=question.id,
                    value=str(opt.get("value") or opt.get("id") or idx),
                    label=opt.get("label") or str(opt.get("value") or ""),
                    order_index=opt.get("order_index") or idx,
                    weight=opt.get("weight") or 1,
                )
            )
    db.commit()
    db.refresh(survey)


@router.get("/", response_model=SurveyAdminListResponse, summary="List surveys")
def list_surveys(db: Session = Depends(get_db), _: int = Depends(get_current_admin_id)) -> SurveyAdminListResponse:
    stmt = select(
        Survey.id,
        Survey.title,
        Survey.status,
        Survey.channel,
        Survey.created_at,
        Survey.updated_at,
        func.count(SurveyQuestion.id),
    ).join(SurveyQuestion, SurveyQuestion.survey_id == Survey.id, isouter=True).group_by(Survey.id)
    rows = db.execute(stmt).all()
    items = [
        SurveyAdminResponse(
            id=row[0],
            title=row[1],
            status=row[2],
            channel=row[3],
            created_at=row[4],
            updated_at=row[5],
            question_count=row[6],
        )
        for row in rows
    ]
    return SurveyAdminListResponse(items=items)


@router.post("/", response_model=SurveyDetailResponse, status_code=status.HTTP_201_CREATED)
def create_survey(
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> SurveyDetailResponse:
    _ = admin_id
    survey = Survey(
        title=payload.title,
        description=payload.description,
        channel=payload.channel,
        status=payload.status or SurveyStatus.DRAFT,
        reward_json=payload.reward_json,
        target_segment_json=payload.target_segment_json,
        auto_launch=payload.auto_launch,
        start_at=payload.start_at,
        end_at=payload.end_at,
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)
    _replace_questions(db, survey, payload)
    return _serialize_detail(survey)


@router.get("/{survey_id}", response_model=SurveyDetailResponse)
def get_survey(survey_id: int, db: Session = Depends(get_db), _: int = Depends(get_current_admin_id)) -> SurveyDetailResponse:
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")
    return _serialize_detail(survey)


@router.put("/{survey_id}", response_model=SurveyDetailResponse)
def update_survey(
    survey_id: int,
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> SurveyDetailResponse:
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")

    survey.title = payload.title
    survey.description = payload.description
    survey.channel = payload.channel
    survey.status = payload.status or survey.status
    survey.reward_json = payload.reward_json
    survey.target_segment_json = payload.target_segment_json
    survey.auto_launch = payload.auto_launch
    survey.start_at = payload.start_at
    survey.end_at = payload.end_at
    db.add(survey)
    db.commit()
    db.refresh(survey)
    _replace_questions(db, survey, payload)
    return _serialize_detail(survey)


@router.get("/{survey_id}/triggers", response_model=SurveyTriggerListResponse)
def list_triggers(
    survey_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> SurveyTriggerListResponse:
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")
    items = [
        SurveyTriggerRuleSchema(
            id=tr.id,
            trigger_type=tr.trigger_type,
            trigger_config_json=tr.trigger_config_json,
            priority=tr.priority,
            cooldown_hours=tr.cooldown_hours,
            max_per_user=tr.max_per_user,
            is_active=tr.is_active,
        )
        for tr in survey.triggers
    ]
    return SurveyTriggerListResponse(items=items)


@router.put("/{survey_id}/triggers", response_model=SurveyTriggerListResponse)
def upsert_triggers(
    survey_id: int,
    payload: list[SurveyTriggerUpsertRequest],
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
) -> SurveyTriggerListResponse:
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")

    survey.triggers.clear()
    db.flush()
    for tr in payload:
        db.add(
            SurveyTriggerRule(
                survey_id=survey.id,
                trigger_type=tr.trigger_type,
                trigger_config_json=tr.trigger_config_json,
                priority=tr.priority,
                cooldown_hours=tr.cooldown_hours,
                max_per_user=tr.max_per_user,
                is_active=tr.is_active,
            )
        )
    db.commit()
    db.refresh(survey)
    return list_triggers(survey_id=survey_id, db=db, _=0)
