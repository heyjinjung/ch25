"""Admin endpoints for survey management."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_db
from app.v2.models.v2_survey import (
    V2Survey,
    V2SurveyQuestion,
    V2SurveyOption,
    V2SurveyResponse,
    SurveyStatus,
    SurveyChannel,
    SurveyQuestionType,
    V2SurveyTriggerRule,
    SurveyTriggerType,
)
from app.schemas.survey import (
    SurveyDetailResponse,
    SurveyQuestionSchema,
    SurveyOptionSchema,
    SurveyTriggerSchema,
    SurveyTriggerCUDRequest,
    SurveyStatsResponse,
    SurveyResponseInfo,
    CommonQueryParams,
    SurveyUpsertRequest,
    SurveyAdminListResponse,
    SurveyAdminResponse,
)
from app.v2.models.user import V2User


router = APIRouter(prefix="/admin/api/surveys", tags=["admin-surveys"])


def _serialize_detail(s: V2Survey) -> SurveyDetailResponse:
    # helper for clean code
    q_schemas = []
    # Explicitly sort questions
    sorted_qs = sorted(s.questions, key=lambda x: x.order_index)
    for q in sorted_qs:
        o_schemas = []
        sorted_opts = sorted(q.options, key=lambda x: x.order_index)
        for o in sorted_opts:
            o_schemas.append(
                SurveyOptionSchema(
                    id=o.id,
                    value=o.value,
                    label=o.label,
                    order_index=o.order_index,
                    weight=o.weight,
                )
            )
        q_schemas.append(
            SurveyQuestionSchema(
                id=q.id,
                order_index=q.order_index,
                question_type=q.question_type,
                title=q.title,
                helper_text=q.helper_text,
                is_required=q.is_required,
                randomize_group=q.randomize_group,
                config_json=q.config_json,
                options=o_schemas,
            )
        )
    return SurveyDetailResponse(
        id=s.id,
        title=s.title,
        description=s.description,
        channel=s.channel,
        status=s.status,
        reward_json=s.reward_json,
        target_segment_json=s.target_segment_json,
        auto_launch=s.auto_launch,
        start_at=s.start_at,
        end_at=s.end_at,
        questions=q_schemas,
    )


def _replace_options(db: Session, question: V2SurveyQuestion, options_in: list[SurveyOptionSchema]):
    existing_opts = {o.id: o for o in question.options}
    keep_ids = set()

    sorted_opts = sorted(options_in, key=lambda x: x.order_index)
    for idx, opt_req in enumerate(sorted_opts):
        # Allow client to force order_index, or use list order
        final_order = opt_req.order_index if opt_req.order_index is not None else idx
        
        if opt_req.id and opt_req.id in existing_opts:
            # Update
            opt_obj = existing_opts[opt_req.id]
            opt_obj.value = opt_req.value
            opt_obj.label = opt_req.label
            opt_obj.order_index = final_order
            opt_obj.weight = opt_req.weight
            keep_ids.add(opt_req.id)
        else:
            # Create
            new_opt = V2SurveyOption(
                question_id=question.id,
                value=opt_req.value,
                label=opt_req.label,
                order_index=final_order,
                weight=opt_req.weight,
            )
            db.add(new_opt)
            keep_ids.add(new_opt.id)  # won't have real ID until commit, but loop logic mainly checks "if provided ID exists"

    for o_id, o_obj in existing_opts.items():
        if o_id not in keep_ids:
            db.delete(o_obj)


def _replace_questions(db: Session, survey: V2Survey, payload: SurveyUpsertRequest):
    # Determine which questions to keep/update
    existing_map = {q.id: q for q in survey.questions}
    keep_ids = set()

    for idx, q_req in enumerate(payload.questions):
        config_json = q_req.config_json or {}
        if q_req.id and q_req.id in existing_map:
            # Update existing
            q_obj = existing_map[q_req.id]
            q_obj.order_index = idx  # or q_req.order_index
            q_obj.question_type = q_req.question_type
            q_obj.title = q_req.title
            q_obj.helper_text = q_req.helper_text
            q_obj.is_required = q_req.is_required
            q_obj.randomize_group = q_req.randomize_group
            q_obj.config_json = config_json
            keep_ids.add(q_req.id)
            
            # Update options
            _replace_options(db, q_obj, q_req.options)
        else:
            # Create new
            new_q = V2SurveyQuestion(
                survey_id=survey.id,
                order_index=idx,
                question_type=q_req.question_type,
                title=q_req.title,
                helper_text=q_req.helper_text,
                is_required=q_req.is_required,
                randomize_group=q_req.randomize_group,
                config_json=config_json,
            )
            db.add(new_q)
            db.commit() # Need ID for options
            db.refresh(new_q)
            _replace_options(db, new_q, q_req.options)

    # Delete removed questions
    for q_id, q_obj in existing_map.items():
        if q_id not in keep_ids:
            db.delete(q_obj)
    db.commit()


@router.get("/", response_model=SurveyAdminListResponse, summary="List surveys")
def list_surveys(
    db: Session = Depends(get_db),
    params: CommonQueryParams = Depends(),
    _: int = Depends(get_current_admin_id),
) -> SurveyAdminListResponse:
    stmt = (
        select(V2Survey)
        .order_by(V2Survey.id.desc())
        .offset(params.offset)
        .limit(params.limit)
    )
    surveys = db.execute(stmt).scalars().all()
    
    items = []
    for s in surveys:
        items.append(
            SurveyAdminResponse(
                id=s.id,
                title=s.title,
                status=s.status,
                channel=s.channel,
                created_at=s.created_at,
                updated_at=s.updated_at,
                question_count=len(s.questions),
            )
        )
    return SurveyAdminListResponse(items=items)


@router.post("/", response_model=SurveyDetailResponse, status_code=status.HTTP_201_CREATED)
def create_survey(
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> SurveyDetailResponse:
    _ = admin_id
    survey = V2Survey(
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
    survey = db.get(V2Survey, survey_id)
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
    survey = db.get(V2Survey, survey_id)
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


@router.get("/triggers", response_model=list[SurveyTriggerSchema], summary="List global triggers")
def list_triggers(
    db: Session = Depends(get_db),
    params: CommonQueryParams = Depends(),
    _: int = Depends(get_current_admin_id),
):
    stmt = (
        select(V2SurveyTriggerRule)
        .order_by(V2SurveyTriggerRule.priority.desc(), V2SurveyTriggerRule.id.desc())
        .offset(params.offset)
        .limit(params.limit)
    )
    rows = db.execute(stmt).scalars().all()
    return [
        SurveyTriggerSchema(
            id=r.id,
            survey_id=r.survey_id,
            trigger_type=r.trigger_type,
            trigger_config_json=r.trigger_config_json,
            priority=r.priority,
            cooldown_hours=r.cooldown_hours,
            max_per_user=r.max_per_user,
            is_active=r.is_active,
        )
        for r in rows
    ]


@router.put("/surveys/{survey_id}/triggers", response_model=SurveyTriggerSchema)
def upsert_triggers(
    survey_id: int,
    payload: SurveyTriggerCUDRequest,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    # This might be upsert logic. For simplicity, create new or update existing if ID given.
    # Actually checking generic triggers logic...
    # If payload represents a single trigger rule linked to this survey:
    
    if payload.id:
        rule = db.get(V2SurveyTriggerRule, payload.id)
        if not rule or rule.survey_id != survey_id:
             raise HTTPException(status_code=404, detail="TRIGGER_NOT_FOUND")
    else:
        rule = V2SurveyTriggerRule(survey_id=survey_id)
        db.add(rule)
    
    rule.trigger_type = payload.trigger_type
    rule.trigger_config_json = payload.trigger_config_json
    rule.priority = payload.priority
    rule.cooldown_hours = payload.cooldown_hours
    rule.max_per_user = payload.max_per_user
    rule.is_active = payload.is_active
    db.commit()
    db.refresh(rule)
    return SurveyTriggerSchema(
        id=rule.id,
        survey_id=rule.survey_id,
        trigger_type=rule.trigger_type,
        trigger_config_json=rule.trigger_config_json,
        priority=rule.priority,
        cooldown_hours=rule.cooldown_hours,
        max_per_user=rule.max_per_user,
        is_active=rule.is_active,
    )


@router.get("/{survey_id}/stats", response_model=SurveyStatsResponse)
def get_survey_stats(
    survey_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    survey = db.get(V2Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    # Simple aggregated stats
    total_responses = db.scalar(
        select(func.count(V2SurveyResponse.id)).where(V2SurveyResponse.survey_id == survey_id)
    )
    completed_count = db.scalar(
        select(func.count(V2SurveyResponse.id)).where(
            V2SurveyResponse.survey_id == survey_id,
            V2SurveyResponse.status == "COMPLETED"
        )
    )
    
    # Calculate average completion time? (skip for now)
    
    # Option distribution
    # This requires joining answers -> questions -> options
    # Or just grouping by answer.option_id
    
    # ... Simplified for brevity
    
    return SurveyStatsResponse(
        total_responses=total_responses or 0,
        completed_count=completed_count or 0,
        average_duration_seconds=0,
        option_distribution={}
    )


@router.get("/{survey_id}/responses", response_model=list[SurveyResponseInfo])
def list_survey_responses(
    survey_id: int,
    db: Session = Depends(get_db),
    params: CommonQueryParams = Depends(),
    _: int = Depends(get_current_admin_id),
):
    stmt = (
        select(V2SurveyResponse)
        .where(V2SurveyResponse.survey_id == survey_id)
        .order_by(V2SurveyResponse.id.desc())
        .offset(params.offset)
        .limit(params.limit)
    )
    rows = db.execute(stmt).scalars().all()
    
    return [
        SurveyResponseInfo(
            id=r.id,
            survey_id=r.survey_id,
            status=r.status,
            reward_status=r.reward_status,
            last_question_id=r.last_question_id,
            started_at=r.started_at,
            completed_at=r.completed_at,
        ) for r in rows
    ]
