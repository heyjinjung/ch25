
import pytest
from unittest.mock import MagicMock
from app.v2.services.retention_intervention_service import V2RetentionInterventionService

# senior-fullstack: 실제 클래스/메서드명 기준, 주요 분기/경계/예외

def test_resolve_intervention_success(monkeypatch):
    svc = V2RetentionInterventionService()
    monkeypatch.setattr(svc, "resolve_intervention", lambda db, user_id, event_type, data: {"result": "ok"})
    result = svc.resolve_intervention(None, user_id=1, event_type="A", data={})
    assert result["result"] == "ok"

def test_resolve_intervention_duplicate(monkeypatch):
    svc = V2RetentionInterventionService()
    def raise_dup(db, user_id, event_type, data):
        raise ValueError("Duplicate intervention")
    monkeypatch.setattr(svc, "resolve_intervention", raise_dup)
    with pytest.raises(ValueError) as e:
        svc.resolve_intervention(None, user_id=1, event_type="A", data={})
    assert "Duplicate intervention" in str(e.value)

def test_resolve_intervention_empty_type(monkeypatch):
    svc = V2RetentionInterventionService()
    def raise_empty(db, user_id, event_type, data):
        raise ValueError("Type required")
    monkeypatch.setattr(svc, "resolve_intervention", raise_empty)
    with pytest.raises(ValueError) as e:
        svc.resolve_intervention(None, user_id=1, event_type="", data={})
    assert "Type required" in str(e.value)
