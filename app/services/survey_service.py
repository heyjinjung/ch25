"""Survey service orchestrating survey sessions and responses."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.survey import (
    Survey,
    SurveyOption,
    SurveyQuestion,
    SurveyResponse,
    SurveyResponseAnswer,
    SurveyResponseStatus,
    SurveyStatus,
)
from app.schemas.survey import (
    SurveyAnswerPayload,
    SurveyDetailResponse,
    SurveyOptionSchema,
    SurveyQuestionSchema,
    SurveyResponseInfo,
    SurveySessionResponse,
    SurveyCompleteResponse,
)
from app.services.survey_reward_service import SurveyRewardService


class SurveyService:
    """Core survey use-cases for users."""

    def __init__(self) -> None:
        self._now = datetime.utcnow
        self.reward_service = SurveyRewardService()

    def _serialize_question(self, question: SurveyQuestion) -> SurveyQuestionSchema:
        return SurveyQuestionSchema(
            id=question.id,
            order_index=question.order_index,
            randomize_group=question.randomize_group,
            question_type=question.question_type,
            title=question.title,
            helper_text=question.helper_text,
            is_required=question.is_required,
            config_json=question.config_json,
            options=[
                SurveyOptionSchema(
                    id=opt.id,
                    value=opt.value,
                    label=opt.label,
                    order_index=opt.order_index,
                    weight=opt.weight,
                )
                for opt in sorted(question.options, key=lambda o: o.order_index)
            ],
        )

    def _serialize_survey(self, survey: Survey) -> SurveyDetailResponse:
        return SurveyDetailResponse(
            id=survey.id,
            title=survey.title,
            description=survey.description,
            channel=survey.channel,
            status=survey.status,
            reward_json=survey.reward_json,
            questions=[self._serialize_question(q) for q in sorted(survey.questions, key=lambda q: q.order_index)],
        )

    def get_active_surveys(self, db: Session, user_id: int) -> list[Survey]:
        now = self._now()
        window_filter = or_(
            and_(Survey.start_at == None, Survey.end_at == None),
            and_(Survey.start_at <= now, Survey.end_at == None),
            and_(Survey.start_at == None, Survey.end_at >= now),
            and_(Survey.start_at <= now, Survey.end_at >= now),
        )
        stmt = select(Survey).where(Survey.status == SurveyStatus.ACTIVE, window_filter)
        return db.execute(stmt).scalars().all()

    def serialize_active(self, surveys: list[Survey], responses: dict[int, SurveyResponse | None]) -> list[SurveyDetailResponse]:
        items: list[SurveyDetailResponse] = []
        for survey in surveys:
            item = self._serialize_survey(survey)
            response = responses.get(survey.id)
            if response:
                item.reward_json = survey.reward_json
            items.append(item)
        return items

    def get_or_create_response(self, db: Session, survey_id: int, user_id: int) -> SurveyResponse:
        response = db.execute(
            select(SurveyResponse)
            .where(SurveyResponse.survey_id == survey_id, SurveyResponse.user_id == user_id)
            .order_by(SurveyResponse.id.desc())
        ).scalar_one_or_none()
        if response:
            return response
        response = SurveyResponse(
            survey_id=survey_id,
            user_id=user_id,
            status=SurveyResponseStatus.PENDING,
            last_activity_at=self._now(),
        )
        db.add(response)
        db.commit()
        db.refresh(response)
        return response

    def get_survey_session(self, db: Session, survey_id: int, user_id: int) -> SurveySessionResponse:
        survey = db.get(Survey, survey_id)
        if not survey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")
        response = self.get_or_create_response(db, survey_id=survey_id, user_id=user_id)
        answers = db.execute(
            select(SurveyResponseAnswer).where(SurveyResponseAnswer.response_id == response.id)
        ).scalars().all()
        response_info = SurveyResponseInfo(
            id=response.id,
            survey_id=response.survey_id,
            status=response.status.value,
            reward_status=response.reward_status.value,
            last_question_id=response.last_question_id,
            started_at=response.started_at,
            completed_at=response.completed_at,
        )
        return SurveySessionResponse(
            response=response_info,
            survey=self._serialize_survey(survey),
            answers=[
                SurveyAnswerPayload(
                    question_id=answer.question_id,
                    option_id=answer.option_id,
                    answer_text=answer.answer_text,
                    answer_number=answer.answer_number,
                    meta_json=answer.meta_json,
                )
                for answer in answers
            ],
        )

    def save_answers(
        self,
        db: Session,
        response_id: int,
        user_id: int,
        payload: Iterable[SurveyAnswerPayload],
        last_question_id: int | None,
    ) -> SurveyResponse:
        response = db.get(SurveyResponse, response_id)
        if not response or response.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RESPONSE_NOT_FOUND")
        if response.status == SurveyResponseStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RESPONSE_COMPLETED")
        now = self._now()
        response.status = SurveyResponseStatus.IN_PROGRESS
        response.started_at = response.started_at or now
        response.last_activity_at = now
        response.last_question_id = last_question_id

        existing_answers = {
            ans.question_id: ans
            for ans in db.execute(
                select(SurveyResponseAnswer).where(SurveyResponseAnswer.response_id == response.id)
            ).scalars()
        }

        for item in payload:
            if item.question_id in existing_answers:
                answer = existing_answers[item.question_id]
                answer.option_id = item.option_id
                answer.answer_text = item.answer_text
                answer.answer_number = item.answer_number
                answer.meta_json = item.meta_json
                answer.answered_at = now
            else:
                db.add(
                    SurveyResponseAnswer(
                        response_id=response.id,
                        question_id=item.question_id,
                        option_id=item.option_id,
                        answer_text=item.answer_text,
                        answer_number=item.answer_number,
                        meta_json=item.meta_json,
                        answered_at=now,
                    )
                )

        db.commit()
        db.refresh(response)
        return response

    def complete_response(self, db: Session, response_id: int, user_id: int, force_submit: bool = False) -> SurveyResponse:
        response = db.get(SurveyResponse, response_id)
        if not response or response.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RESPONSE_NOT_FOUND")
        if response.status == SurveyResponseStatus.COMPLETED:
            return response

        survey = db.get(Survey, response.survey_id)
        if not survey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")

        answers = {
            ans.question_id: ans
            for ans in db.execute(
                select(SurveyResponseAnswer).where(SurveyResponseAnswer.response_id == response.id)
            ).scalars()
        }
        missing_required = []
        for question in survey.questions:
            if not question.is_required:
                continue
            if question.id not in answers or not self._has_answer(answers[question.id], question):
                missing_required.append(question.id)
        if missing_required and not force_submit:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="REQUIRED_ANSWERS_MISSING")

        now = self._now()
        response.status = SurveyResponseStatus.COMPLETED
        response.completed_at = now
        response.last_activity_at = now
        db.add(response)
        db.commit()
        db.refresh(response)
        return response

    def complete_with_reward(
        self,
        db: Session,
        response_id: int,
        user_id: int,
        force_submit: bool = False,
    ) -> SurveyCompleteResponse:
        response = self.complete_response(db=db, response_id=response_id, user_id=user_id, force_submit=force_submit)
        survey = db.get(Survey, response.survey_id)
        if not survey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SURVEY_NOT_FOUND")
        applied, toast = self.reward_service.apply_reward(db=db, survey=survey, response=response)
        resp_info = SurveyResponseInfo(
            id=response.id,
            survey_id=response.survey_id,
            status=response.status.value,
            reward_status=response.reward_status.value,
            last_question_id=response.last_question_id,
            started_at=response.started_at,
            completed_at=response.completed_at,
        )
        return SurveyCompleteResponse(response=resp_info, reward_applied=applied, toast_message=toast)

    @staticmethod
    def _has_answer(answer: SurveyResponseAnswer, question: SurveyQuestion | None = None) -> bool:
        if answer.option_id is not None:
            return True
        if question and question.question_type == "MULTI_CHOICE" and answer.meta_json:
            return True
        if answer.answer_text and answer.answer_text.strip():
            return True
        if answer.answer_number is not None:
            return True
        if answer.meta_json:
            return True
        return False
