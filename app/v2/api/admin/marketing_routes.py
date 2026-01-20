from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_info, get_db
from app.models.survey import (
    Survey,
    SurveyOption,
    SurveyQuestion,
    SurveyQuestionType,
    SurveyResponse,
    SurveyResponseAnswer,
    SurveyResponseStatus,
    SurveyStatus,
)
from app.schemas.survey import SurveyDetailResponse, SurveyUpsertRequest
from app.v2.models.v2_admin_message import V2AdminMessage
from app.v2.schemas.v2_admin_marketing import (
    V2AdminSurveyDto,
    V2AdminSurveyQuestionDto,
    V2AdminSurveyResultDto,
    V2AdminSurveyResultOptionDto,
    V2AdminSurveyToggleRequest,
)
from app.v2.schemas.v2_admin_message import V2MessageCreate, V2MessageResponse
from app.v2.services.admin_message_service import V2AdminMessageService

router = APIRouter()


@router.get("/marketing/messages", response_model=list[V2MessageResponse])
def list_admin_marketing_messages(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> list[V2MessageResponse]:
    _admin_id, _admin_role = admin_info

    items = (
        db.query(V2AdminMessage)
        .filter(V2AdminMessage.is_deleted.is_(False))
        .order_by(V2AdminMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items


@router.post("/marketing/messages", response_model=V2MessageResponse, status_code=201)
def create_admin_marketing_message(
    payload: V2MessageCreate,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> V2MessageResponse:
    admin_id, _admin_role = admin_info

    if payload.target_type != "ALL" and not (payload.target_value and payload.target_value.strip()):
        raise HTTPException(status_code=400, detail="TARGET_VALUE_REQUIRED")

    resolved_user_ids = None
    if payload.target_type == "USER" and payload.target_value:
        resolved_user_ids = []
        for raw in payload.target_value.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                resolved_user_ids.append(int(raw))
            except ValueError:
                continue

    msg = V2AdminMessageService.create_message(
        db,
        sender_admin_id=admin_id,
        title=payload.title,
        content=payload.content,
        target_type=payload.target_type,
        target_value=payload.target_value,
        channels=payload.channels,
    )
    V2AdminMessageService.fan_out_message(
        db,
        message_id=msg.id,
        target_type=payload.target_type,
        target_value=payload.target_value,
        resolved_user_ids=resolved_user_ids,
    )
    return msg


def _map_survey_question_type(question_type: SurveyQuestionType) -> str:
    raw = question_type.value if hasattr(question_type, "value") else str(question_type)
    if raw == SurveyQuestionType.SINGLE_CHOICE.value:
        return "SINGLE"
    if raw == SurveyQuestionType.MULTI_CHOICE.value:
        return "MULTIPLE"
    return "TEXT"


def _serialize_survey_detail(survey: Survey) -> SurveyDetailResponse:
    from app.schemas.survey import SurveyOptionSchema, SurveyQuestionSchema

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
                    SurveyOptionSchema(
                        id=opt.id,
                        value=opt.value,
                        label=opt.label,
                        order_index=opt.order_index,
                        weight=opt.weight,
                    )
                    for opt in sorted(q.options, key=lambda o: o.order_index)
                ],
            )
            for q in sorted(survey.questions, key=lambda q: q.order_index)
        ],
    )


def _replace_survey_questions(db: Session, survey: Survey, payload: SurveyUpsertRequest) -> None:
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


@router.get("/marketing/surveys", response_model=list[V2AdminSurveyDto])
def list_admin_marketing_surveys(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> list[V2AdminSurveyDto]:
    _admin_id, _admin_role = admin_info

    surveys = (
        db.query(Survey)
        .options(selectinload(Survey.questions).selectinload(SurveyQuestion.options))
        .order_by(Survey.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    counts = dict(
        db.query(SurveyResponse.survey_id, func.count(SurveyResponse.id))
        .filter(SurveyResponse.status == SurveyResponseStatus.COMPLETED)
        .group_by(SurveyResponse.survey_id)
        .all()
    )

    result: list[V2AdminSurveyDto] = []
    for s in surveys:
        questions = [
            V2AdminSurveyQuestionDto(
                id=q.id,
                type=_map_survey_question_type(q.question_type),
                question=q.title,
                options=[opt.label for opt in sorted(q.options, key=lambda o: o.order_index)]
                if q.options
                else None,
            )
            for q in sorted(s.questions, key=lambda q: q.order_index)
        ]
        result.append(
            V2AdminSurveyDto(
                id=s.id,
                title=s.title,
                description=s.description,
                questions=questions,
                is_active=(s.status == SurveyStatus.ACTIVE),
                response_count=int(counts.get(s.id, 0) or 0),
                created_at=s.created_at,
            )
        )
    return result


@router.post("/marketing/surveys", response_model=SurveyDetailResponse, status_code=201)
def create_admin_marketing_survey(
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> SurveyDetailResponse:
    admin_id, _admin_role = admin_info

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
        created_by=admin_id,
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)
    _replace_survey_questions(db, survey, payload)
    return _serialize_survey_detail(survey)


@router.get("/marketing/surveys/{survey_id}", response_model=SurveyDetailResponse)
def get_admin_marketing_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> SurveyDetailResponse:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")
    return _serialize_survey_detail(survey)


@router.put("/marketing/surveys/{survey_id}", response_model=SurveyDetailResponse)
def update_admin_marketing_survey(
    survey_id: int,
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> SurveyDetailResponse:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

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
    _replace_survey_questions(db, survey, payload)
    return _serialize_survey_detail(survey)


@router.delete("/marketing/surveys/{survey_id}")
def delete_admin_marketing_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> dict:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    survey.status = SurveyStatus.ARCHIVED
    survey.updated_at = datetime.utcnow()
    db.add(survey)
    db.commit()
    return {"ok": True}


@router.put("/marketing/surveys/{survey_id}/toggle")
def toggle_admin_marketing_survey(
    survey_id: int,
    payload: V2AdminSurveyToggleRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> dict:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    survey.status = SurveyStatus.ACTIVE if payload.is_active else SurveyStatus.PAUSED
    survey.updated_at = datetime.utcnow()
    db.add(survey)
    db.commit()
    return {"ok": True}


@router.get("/marketing/surveys/{survey_id}/results", response_model=list[V2AdminSurveyResultDto])
def get_admin_marketing_survey_results(
    survey_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> list[V2AdminSurveyResultDto]:
    _admin_id, _admin_role = admin_info
    survey = (
        db.query(Survey)
        .options(selectinload(Survey.questions).selectinload(SurveyQuestion.options))
        .filter(Survey.id == survey_id)
        .first()
    )
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    results: list[V2AdminSurveyResultDto] = []
    for q in sorted(survey.questions, key=lambda q: q.order_index):
        if q.options:
            rows = (
                db.query(SurveyResponseAnswer.option_id, func.count(SurveyResponseAnswer.id))
                .join(SurveyResponse, SurveyResponseAnswer.response_id == SurveyResponse.id)
                .filter(
                    SurveyResponse.survey_id == survey_id,
                    SurveyResponse.status == SurveyResponseStatus.COMPLETED,
                    SurveyResponseAnswer.question_id == q.id,
                )
                .group_by(SurveyResponseAnswer.option_id)
                .all()
            )
            count_by_option_id = {int(opt_id): int(cnt) for opt_id, cnt in rows if opt_id is not None}
            total = sum(count_by_option_id.values())

            option_items: list[V2AdminSurveyResultOptionDto] = []
            for opt in sorted(q.options, key=lambda o: o.order_index):
                cnt = int(count_by_option_id.get(opt.id, 0))
                pct = int(round((cnt * 100) / total)) if total > 0 else 0
                option_items.append(
                    V2AdminSurveyResultOptionDto(option=opt.label, count=cnt, percentage=pct)
                )

            results.append(
                V2AdminSurveyResultDto(
                    survey_id=survey_id,
                    question_id=q.id,
                    question=q.title,
                    responses=option_items,
                )
            )
            continue

        text_count = (
            db.query(func.count(SurveyResponseAnswer.id))
            .join(SurveyResponse, SurveyResponseAnswer.response_id == SurveyResponse.id)
            .filter(
                SurveyResponse.survey_id == survey_id,
                SurveyResponse.status == SurveyResponseStatus.COMPLETED,
                SurveyResponseAnswer.question_id == q.id,
            )
            .scalar()
        )
        total = int(text_count or 0)
        results.append(
            V2AdminSurveyResultDto(
                survey_id=survey_id,
                question_id=q.id,
                question=q.title,
                responses=[
                    V2AdminSurveyResultOptionDto(option="응답", count=total, percentage=100 if total > 0 else 0)
                ],
            )
        )

    return results
