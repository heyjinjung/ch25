"""Survey and retention models."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base


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


class Survey(Base):
    __tablename__ = "survey"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(SurveyStatus), nullable=False, default=SurveyStatus.DRAFT)
    channel = Column(SAEnum(SurveyChannel), nullable=False, default=SurveyChannel.GLOBAL)
    target_segment_json = Column(JSON, nullable=True)
    reward_json = Column(JSON, nullable=True)
    auto_launch = Column(Boolean, nullable=False, default=False)
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship("SurveyQuestion", cascade="all, delete-orphan", back_populates="survey")
    triggers = relationship("SurveyTriggerRule", cascade="all, delete-orphan", back_populates="survey")


class SurveyQuestionType(str, Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTI_CHOICE = "MULTI_CHOICE"
    LIKERT = "LIKERT"
    TEXT = "TEXT"
    NUMBER = "NUMBER"


class SurveyQuestion(Base):
    __tablename__ = "survey_question"
    __table_args__ = (UniqueConstraint("survey_id", "order_index", name="uq_survey_question_order"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_id = Column(Integer, ForeignKey("survey.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False)
    randomize_group = Column(String(50), nullable=True)
    question_type = Column(SAEnum(SurveyQuestionType), nullable=False)
    title = Column(String(255), nullable=False)
    helper_text = Column(String(255), nullable=True)
    is_required = Column(Boolean, nullable=False, default=True)
    config_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    survey = relationship("Survey", back_populates="questions")
    options = relationship("SurveyOption", cascade="all, delete-orphan", back_populates="question")


class SurveyOption(Base):
    __tablename__ = "survey_option"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("survey_question.id", ondelete="CASCADE"), nullable=False)
    value = Column(String(100), nullable=False)
    label = Column(String(150), nullable=False)
    order_index = Column(Integer, nullable=False)
    weight = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    question = relationship("SurveyQuestion", back_populates="options")


class SurveyTriggerType(str, Enum):
    LEVEL_UP = "LEVEL_UP"
    INACTIVE_DAYS = "INACTIVE_DAYS"
    GAME_RESULT = "GAME_RESULT"
    MANUAL_PUSH = "MANUAL_PUSH"


class SurveyTriggerRule(Base):
    __tablename__ = "survey_trigger_rule"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_id = Column(Integer, ForeignKey("survey.id", ondelete="CASCADE"), nullable=False)
    trigger_type = Column(SAEnum(SurveyTriggerType), nullable=False)
    trigger_config_json = Column(JSON, nullable=True)
    priority = Column(Integer, nullable=False, default=100)
    cooldown_hours = Column(Integer, nullable=False, default=24)
    max_per_user = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    survey = relationship("Survey", back_populates="triggers")
    responses = relationship("SurveyResponse", back_populates="trigger_rule")


class SurveyResponseStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"
    EXPIRED = "EXPIRED"


class SurveyRewardStatus(str, Enum):
    NONE = "NONE"
    SCHEDULED = "SCHEDULED"
    GRANTED = "GRANTED"
    FAILED = "FAILED"


class SurveyResponse(Base):
    __tablename__ = "survey_response"
    __table_args__ = (
        CheckConstraint("reward_status IN ('NONE','SCHEDULED','GRANTED','FAILED')", name="ck_survey_reward_status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_id = Column(Integer, ForeignKey("survey.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    trigger_rule_id = Column(Integer, ForeignKey("survey_trigger_rule.id", ondelete="SET NULL"), nullable=True)
    status = Column(SAEnum(SurveyResponseStatus), nullable=False, default=SurveyResponseStatus.PENDING)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    dropped_at = Column(DateTime, nullable=True)
    reward_status = Column(SAEnum(SurveyRewardStatus), nullable=False, default=SurveyRewardStatus.NONE)
    reward_payload = Column(JSON, nullable=True)
    last_question_id = Column(Integer, ForeignKey("survey_question.id", ondelete="SET NULL"), nullable=True)
    last_activity_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    survey = relationship("Survey")
    trigger_rule = relationship("SurveyTriggerRule", back_populates="responses")
    answers = relationship("SurveyResponseAnswer", cascade="all, delete-orphan", back_populates="response")


class SurveyResponseAnswer(Base):
    __tablename__ = "survey_response_answer"
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_response_question"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    response_id = Column(Integer, ForeignKey("survey_response.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("survey_question.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(Integer, ForeignKey("survey_option.id", ondelete="SET NULL"), nullable=True)
    answer_text = Column(Text, nullable=True)
    answer_number = Column(Integer, nullable=True)
    meta_json = Column(JSON, nullable=True)
    answered_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion")
    option = relationship("SurveyOption")
