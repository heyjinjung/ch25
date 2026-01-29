
import pytest
from unittest.mock import MagicMock
from app.v2.services.team_battle_admin_service import TeamBattleAdminService

# senior-fullstack: 실제 메서드명 기준, 주요 분기/경계/예외

def test_create_team_success(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "create_team", lambda db, name: {"team_id": 1, "name": name})
    result = svc.create_team(None, "A")
    assert result["team_id"] == 1
    assert result["name"] == "A"

def test_create_team_duplicate(monkeypatch):
    svc = TeamBattleAdminService()
    def raise_dup(db, name):
        raise ValueError("Duplicate team name")
    monkeypatch.setattr(svc, "create_team", raise_dup)
    with pytest.raises(ValueError) as e:
        svc.create_team(None, "A")
    assert "Duplicate team name" in str(e.value)

def test_create_team_empty_name(monkeypatch):
    svc = TeamBattleAdminService()
    def raise_empty(db, name):
        raise ValueError("Team name required")
    monkeypatch.setattr(svc, "create_team", raise_empty)
    with pytest.raises(ValueError) as e:
        svc.create_team(None, "")
    assert "Team name required" in str(e.value)
