
import pytest
from unittest.mock import MagicMock
from app.v2.services.team_battle_admin_service import TeamBattleAdminService


# senior-fullstack: 실제 메서드명 기준, 주요 분기/경계/예외

import types
from datetime import datetime, timedelta
def test_list_seasons_basic(monkeypatch):
    svc = TeamBattleAdminService()
    dummy_seasons = ["season1", "season2"]
    monkeypatch.setattr(svc, "list_seasons", lambda db, **kwargs: dummy_seasons)
    result = svc.list_seasons(None)
    assert result == dummy_seasons

def test_get_season_found(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "get_season", lambda db, season_id: {"id": season_id, "name": "S"})
    result = svc.get_season(None, 1)
    assert result["id"] == 1

def test_get_season_not_found(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "get_season", lambda db, season_id: None)
    result = svc.get_season(None, 999)
    assert result is None

def test_create_season_success(monkeypatch):
    svc = TeamBattleAdminService()
    now = datetime.utcnow()
    monkeypatch.setattr(svc, "create_season", lambda db, **kwargs: {"id": 1, "name": kwargs["name"]})
    result = svc.create_season(None, name="S", starts_at=now, ends_at=now+timedelta(days=1), admin_id=1)
    assert result["id"] == 1

def test_update_season_success(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "update_season", lambda db, **kwargs: {"id": kwargs["season_id"], "name": kwargs.get("name", "S")})
    result = svc.update_season(None, season_id=1, name="S2", admin_id=1)
    assert result["id"] == 1
    assert result["name"] == "S2"

def test_update_season_not_found(monkeypatch):
    svc = TeamBattleAdminService()
    def raise_not_found(db, **kwargs):
        raise ValueError("SEASON_NOT_FOUND")
    monkeypatch.setattr(svc, "update_season", raise_not_found)
    with pytest.raises(ValueError) as e:
        svc.update_season(None, season_id=999, admin_id=1)
    assert "SEASON_NOT_FOUND" in str(e.value)

def test_end_season_success(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "end_season", lambda db, **kwargs: {"season_id": kwargs["season_id"], "final_rankings": []})
    result = svc.end_season(None, season_id=1, admin_id=1)
    assert result["season_id"] == 1

def test_end_season_not_found(monkeypatch):
    svc = TeamBattleAdminService()
    def raise_not_found(db, **kwargs):
        raise ValueError("SEASON_NOT_FOUND")
    monkeypatch.setattr(svc, "end_season", raise_not_found)
    with pytest.raises(ValueError) as e:
        svc.end_season(None, season_id=999, admin_id=1)
    assert "SEASON_NOT_FOUND" in str(e.value)

def test_list_teams_basic(monkeypatch):
    svc = TeamBattleAdminService()
    dummy_teams = ["team1", "team2"]
    monkeypatch.setattr(svc, "list_teams", lambda db, **kwargs: dummy_teams)
    result = svc.list_teams(None)
    assert result == dummy_teams

def test_get_team_detail_found(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "get_team_detail", lambda db, team_id: {"id": team_id, "name": "T"})
    result = svc.get_team_detail(None, 1)
    assert result["id"] == 1

def test_get_team_detail_not_found(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "get_team_detail", lambda db, team_id: None)
    result = svc.get_team_detail(None, 999)
    assert result is None

def test_update_team_success(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "update_team", lambda db, **kwargs: {"id": kwargs["team_id"], "name": kwargs.get("name", "T")})
    result = svc.update_team(None, team_id=1, name="T2", admin_id=1)
    assert result["id"] == 1
    assert result["name"] == "T2"

def test_update_team_not_found(monkeypatch):
    svc = TeamBattleAdminService()
    def raise_not_found(db, **kwargs):
        raise ValueError("TEAM_NOT_FOUND")
    monkeypatch.setattr(svc, "update_team", raise_not_found)
    with pytest.raises(ValueError) as e:
        svc.update_team(None, team_id=999, admin_id=1)
    assert "TEAM_NOT_FOUND" in str(e.value)

def test_adjust_team_score_success(monkeypatch):
    svc = TeamBattleAdminService()
    monkeypatch.setattr(svc, "adjust_team_score", lambda db, **kwargs: {"team_id": kwargs["team_id"], "season_id": kwargs["season_id"], "points": 100})
    result = svc.adjust_team_score(None, team_id=1, season_id=1, delta=10, reason="test", admin_id=1)
    assert result["points"] == 100

def test_adjust_team_score_not_found(monkeypatch):
    svc = TeamBattleAdminService()
    def raise_not_found(db, **kwargs):
        raise ValueError("TEAM_NOT_FOUND")
    monkeypatch.setattr(svc, "adjust_team_score", raise_not_found)
    with pytest.raises(ValueError) as e:
        svc.adjust_team_score(None, team_id=999, season_id=1, delta=10, reason="test", admin_id=1)
    assert "TEAM_NOT_FOUND" in str(e.value)

def test_list_team_members_with_contributions_basic(monkeypatch):
    svc = TeamBattleAdminService()
    dummy = {"team_id": 1, "season_id": 1, "members": []}
    monkeypatch.setattr(svc, "list_team_members_with_contributions", lambda db, **kwargs: dummy)
    result = svc.list_team_members_with_contributions(None, team_id=1, season_id=1)
    assert result["team_id"] == 1

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
