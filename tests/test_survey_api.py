from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.survey import (
    Survey,
    SurveyOption,
    SurveyQuestion,
    SurveyQuestionType,
    SurveyResponse,
    SurveyStatus,
    SurveyTriggerRule,
    SurveyTriggerType,
)
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet


@pytest.fixture()
def seed_survey(session_factory) -> None:
    session: Session = session_factory()
    user = User(id=1, external_id="tester", status="ACTIVE")
    survey = Survey(
        title="만족도 설문",
        description="게임 이용 만족도 조사",
        status=SurveyStatus.ACTIVE,
        channel="GLOBAL",
        reward_json={"reward_type": "TICKET_DICE", "amount": 1, "toast_message": "주사위 티켓 1장 지급"},
        start_at=datetime.utcnow() - timedelta(days=1),
        end_at=datetime.utcnow() + timedelta(days=7),
    )
    question = SurveyQuestion(
        survey=survey,
        order_index=1,
        question_type=SurveyQuestionType.SINGLE_CHOICE,
        title="게임 재미는 어떤가요?",
        is_required=True,
    )
    option1 = SurveyOption(question=question, value="good", label="재미있음", order_index=1)
    option2 = SurveyOption(question=question, value="bad", label="별로", order_index=2)
    trigger = SurveyTriggerRule(survey=survey, trigger_type=SurveyTriggerType.MANUAL_PUSH)
    session.add_all([user, survey, question, option1, option2, trigger])
    session.commit()
    session.close()


def test_list_active_surveys(client: TestClient, seed_survey) -> None:
    resp = client.get("/api/surveys/active")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"], "Active survey should be returned"
    assert data["items"][0]["title"] == "만족도 설문"


def test_survey_session_and_completion_flow(client: TestClient, seed_survey, session_factory) -> None:
    # Create or fetch session
    session_resp = client.post("/api/surveys/1/responses")
    assert session_resp.status_code == 200
    session_data = session_resp.json()
    response_id = session_data["response"]["id"]

    # Save an answer
    patch_resp = client.patch(
        f"/api/surveys/1/responses/{response_id}",
        json={"answers": [{"question_id": 1, "option_id": 1}], "last_question_id": 1},
    )
    assert patch_resp.status_code == 200

    # Complete and expect reward applied
    complete_resp = client.post(
        f"/api/surveys/1/responses/{response_id}/complete",
        json={"force_submit": True},
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()
    assert data["reward_applied"] is True
    assert data["response"]["reward_status"] == "GRANTED"

    # Verify DB response status
    session: Session = session_factory()
    response = session.get(SurveyResponse, response_id)
    assert response.status.name == "COMPLETED"
    assert response.reward_status.name == "GRANTED"
    session.close()


def test_required_multi_choice_validation(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    user = User(id=1, external_id="tester", status="ACTIVE")
    survey = Survey(
        title="다중선택 필수 설문",
        description="체크박스 질문 포함",
        status=SurveyStatus.ACTIVE,
        channel="GLOBAL",
        reward_json={"reward_type": "TICKET_DICE", "amount": 1},
        start_at=datetime.utcnow() - timedelta(days=1),
        end_at=datetime.utcnow() + timedelta(days=7),
    )
    question = SurveyQuestion(
        survey=survey,
        order_index=1,
        question_type=SurveyQuestionType.MULTI_CHOICE,
        title="어떤 보상을 선호하나요?",
        is_required=True,
    )
    option1 = SurveyOption(question=question, value="token", label="토큰", order_index=1)
    option2 = SurveyOption(question=question, value="coupon", label="쿠폰", order_index=2)
    session.add_all([user, survey, question, option1, option2])
    session.commit()
    question_id = question.id
    session.close()

    session_resp = client.post("/api/surveys/1/responses")
    response_id = session_resp.json()["response"]["id"]

    # Save without selecting any options (empty meta) should not satisfy required check
    patch_resp = client.patch(
        f"/api/surveys/1/responses/{response_id}",
        json={"answers": [{"question_id": question_id, "meta_json": {}}], "last_question_id": question_id},
    )
    assert patch_resp.status_code == 200

    complete_fail = client.post(f"/api/surveys/1/responses/{response_id}/complete", json={"force_submit": False})
    assert complete_fail.status_code == 400
    assert "REQUIRED" in str(complete_fail.json())

    # Now submit with a selected choice (meta_json populated) and complete should succeed
    patch_resp_ok = client.patch(
        f"/api/surveys/1/responses/{response_id}",
        json={"answers": [{"question_id": question_id, "meta_json": {"selected": ["token"]}}], "last_question_id": question_id},
    )
    assert patch_resp_ok.status_code == 200

    complete_ok = client.post(f"/api/surveys/1/responses/{response_id}/complete", json={"force_submit": False})
    assert complete_ok.status_code == 200
    assert complete_ok.json()["response"]["status"] == "COMPLETED"


def test_concurrent_completion_idempotent_reward(client: TestClient, seed_survey, session_factory) -> None:
    session_resp = client.post("/api/surveys/1/responses")
    response_id = session_resp.json()["response"]["id"]

    client.patch(
        f"/api/surveys/1/responses/{response_id}",
        json={"answers": [{"question_id": 1, "option_id": 1}], "last_question_id": 1},
    )

    first_complete = client.post(
        f"/api/surveys/1/responses/{response_id}/complete",
        json={"force_submit": True},
    )
    assert first_complete.status_code == 200
    assert first_complete.json()["response"]["reward_status"] == "GRANTED"

    # Simulate a second concurrent completion call; reward should not double-count
    second_complete = client.post(
        f"/api/surveys/1/responses/{response_id}/complete",
        json={"force_submit": True},
    )
    assert second_complete.status_code == 200
    assert second_complete.json()["response"]["reward_status"] == "GRANTED"

    session: Session = session_factory()
    wallet = (
        session.query(UserGameWallet)
        .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == GameTokenType.DICE_TOKEN)
        .one()
    )
    assert wallet.balance == 11, "Reward should be granted only once even with repeated completion calls"
    session.close()
