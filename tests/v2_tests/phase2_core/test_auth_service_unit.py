import pytest
from app.v2.services import auth_service
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

class DummyDB:
    def __init__(self):
        self.events = []
    def add(self, event):
        self.events.append(event)
    def commit(self):
        pass
    def flush(self):
        pass

class DummyEvent:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

# log_auth_event 테스트
@pytest.mark.parametrize("event_type,success,error_message", [
    (auth_service.AuthEventType.LOGIN_SUCCESS, True, None), 
    (auth_service.AuthEventType.LOGIN_FAILED, False, "에러")
])
def test_log_auth_event_basic(monkeypatch, event_type, success, error_message):
    db = DummyDB()
    monkeypatch.setattr(auth_service, "V2UserAuthEvent", lambda **kwargs: DummyEvent(**kwargs))
    event = auth_service.log_auth_event(
        db=db,
        user_id=1,
        event_type=event_type,
        ip_address="127.0.0.1",
        user_agent="test-agent",
        telegram_id=12345,
        success=success,
        error_message=error_message,
    )
    assert event.user_id == 1
    assert event.event_type == event_type
    assert event.ip_address == "127.0.0.1"
    assert event.user_agent == "test-agent"
    assert event.telegram_id == 12345
    assert event.success == success
    if error_message:
        assert event.error_message == error_message

# _coerce_utc 테스트
@pytest.mark.parametrize("dt,expected_tz", [
    (datetime(2024,1,1), timezone.utc),
    (datetime(2024,1,1, tzinfo=timezone.utc), timezone.utc),
])
def test_coerce_utc(dt, expected_tz):
    result = auth_service._coerce_utc(dt)
    assert result.tzinfo == expected_tz
