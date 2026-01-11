from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.survey import (
    Survey,
    SurveyQuestion,
    SurveyQuestionType,
    SurveyResponse,
    SurveyResponseAnswer,
    SurveyResponseStatus,
    SurveyStatus,
)
from app.models.user import User


@pytest.fixture()
def seed_survey_data(session_factory) -> dict:
    session: Session = session_factory()
    
    # 1. Admin setup (using ID 1 as standard admin mock in other tests)
    admin = User(id=999, external_id="admin_user", nickname="admin", status="ACTIVE")
    
    # 2. Survey setup
    survey = Survey(
        title="Stats Test Survey",
        description="Stats Test",
        status=SurveyStatus.ACTIVE,
        channel="GLOBAL",
        reward_json={"reward_type": "TICKET_DICE", "amount": 1},
        start_at=datetime.utcnow() - timedelta(days=1),
        end_at=datetime.utcnow() + timedelta(days=7),
    )
    
    # 3. Question setup
    q1 = SurveyQuestion(
        survey=survey,
        order_index=1,
        question_type=SurveyQuestionType.TEXT,
        title="Feedback",
        is_required=True,
    )
    
    session.add(admin)
    session.add(survey)
    session.flush()
    session.add(q1)
    session.commit()
    
    # 4. Responses setup
    # User A: Completed
    user_a = User(id=101, external_id="user_a", nickname="UserA", status="ACTIVE")
    resp_a = SurveyResponse(
        survey_id=survey.id,
        user_id=user_a.id,
        status=SurveyResponseStatus.COMPLETED,
        reward_status="GRANTED",
        updated_at=datetime.utcnow()
    )
    session.add(user_a)
    session.add(resp_a)
    session.flush()
    
    ans_a = SurveyResponseAnswer(
        response_id=resp_a.id,
        question_id=q1.id,
        answer_text="Great game!"
    )
    session.add(ans_a)
    
    # User B: In Progress (Should not be counted in stats)
    user_b = User(id=102, external_id="user_b", nickname="UserB", status="ACTIVE")
    resp_b = SurveyResponse(
        survey_id=survey.id,
        user_id=user_b.id,
        status=SurveyResponseStatus.IN_PROGRESS,
        updated_at=datetime.utcnow()
    )
    session.add(user_b)
    session.add(resp_b)
    
    session.commit()
    
    data = {"survey_id": survey.id, "q1_id": q1.id}
    session.close()
    return data


def test_get_survey_stats(client: TestClient, seed_survey_data, monkeypatch) -> None:
    # Mock admin auth
    from app.api.deps import get_current_admin_id
    monkeypatch.setattr("app.api.deps.get_current_admin_id", lambda: 999)
    # Also need to override dependency in app if necessary, but app.dependency_overrides is cleaner.
    # Here assuming standard dependency injection override or monkeypatching the function import if used directly.
    # FastAPI dependency override is robust:
    client.app.dependency_overrides[get_current_admin_id] = lambda: 999

    survey_id = seed_survey_data["survey_id"]
    
    resp = client.get(f"/admin/api/surveys/{survey_id}/stats")
    assert resp.status_code == 200
    data = resp.json()
    
    # Only User A is COMPLETED, so count should be 1
    assert data["total_completed"] == 1


def test_list_survey_responses_admin(client: TestClient, seed_survey_data) -> None:
    # Mock admin auth
    from app.api.deps import get_current_admin_id
    client.app.dependency_overrides[get_current_admin_id] = lambda: 999
    
    survey_id = seed_survey_data["survey_id"]
    
    resp = client.get(f"/admin/api/surveys/{survey_id}/responses")
    assert resp.status_code == 200
    data = resp.json()
    
    items = data["items"]
    assert len(items) == 1
    
    first_item = items[0]
    assert first_item["username"] == "UserA"
    assert first_item["user_id"] == 101
    assert len(first_item["answers"]) == 1
    assert first_item["answers"][0]["answer_text"] == "Great game!"
    
    # Pagination: limit=0 should return empty
    resp_empty = client.get(f"/admin/api/surveys/{survey_id}/responses?limit=0")
    assert len(resp_empty.json()["items"]) == 0
