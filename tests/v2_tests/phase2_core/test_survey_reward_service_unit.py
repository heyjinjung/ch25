
import pytest
from unittest.mock import MagicMock
from app.v2.services.survey_reward_service import V2SurveyRewardService

# senior-fullstack: 실제 클래스/메서드명 기준, 주요 분기/경계/예외

class DummySurvey: pass
class DummySurveyResponse: pass

def test_apply_reward_success(monkeypatch):
    svc = V2SurveyRewardService()
    monkeypatch.setattr(svc, "apply_reward", lambda db, survey, response: (True, None))
    ok, msg = svc.apply_reward(None, DummySurvey(), DummySurveyResponse())
    assert ok is True
    assert msg is None

def test_apply_reward_fail(monkeypatch):
    svc = V2SurveyRewardService()
    monkeypatch.setattr(svc, "apply_reward", lambda db, survey, response: (False, "fail"))
    ok, msg = svc.apply_reward(None, DummySurvey(), DummySurveyResponse())
    assert ok is False
    assert msg == "fail"

def test_apply_reward_invalid_input(monkeypatch):
    svc = V2SurveyRewardService()
    def raise_invalid(db, survey, response):
        raise ValueError("Invalid input")
    monkeypatch.setattr(svc, "apply_reward", raise_invalid)
    with pytest.raises(ValueError) as e:
        svc.apply_reward(None, None, None)
    assert "Invalid input" in str(e.value)
