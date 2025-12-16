"""Regression tests: deleted users should not occupy team slots."""

from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from app.models.user import User


def test_admin_user_delete_removes_team_membership(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    team = Team(name="Alpha", is_active=True)
    user = User(id=123, external_id="u123", status="ACTIVE")
    session.add_all([team, user])
    session.commit()

    session.add(TeamMember(user_id=user.id, team_id=team.id, role="member"))
    session.commit()
    session.close()

    resp = client.delete("/admin/api/users/123")
    assert resp.status_code == 204

    session = session_factory()
    assert session.get(TeamMember, 123) is None
    session.close()


def test_leaderboard_member_count_excludes_deleted_users(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    now = datetime.utcnow()
    season = TeamSeason(
        name="Season One",
        starts_at=now - timedelta(hours=1),
        ends_at=now + timedelta(hours=1),
        is_active=True,
    )
    team = Team(name="Alpha", is_active=True)
    active_user = User(id=10, external_id="u10", status="ACTIVE")
    deleted_user = User(id=20, external_id="u20", status="DELETED")

    session.add_all([season, team, active_user, deleted_user])
    session.commit()

    session.add_all(
        [
            TeamMember(user_id=active_user.id, team_id=team.id, role="member"),
            TeamMember(user_id=deleted_user.id, team_id=team.id, role="member"),
            TeamScore(team_id=team.id, season_id=season.id, points=100),
        ]
    )
    session.commit()
    session.close()

    resp = client.get("/api/team-battle/teams/leaderboard", params={"limit": 10, "offset": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1

    row = next(r for r in data if r["team_id"] == team.id)
    assert row["member_count"] == 1


def test_admin_can_delete_team_with_related_rows(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    now = datetime.utcnow()
    season = TeamSeason(
        name="Season Delete",
        starts_at=now - timedelta(hours=1),
        ends_at=now + timedelta(hours=1),
        is_active=True,
    )
    team = Team(name="Team To Delete", is_active=True)
    user = User(id=777, external_id="u777", status="ACTIVE")
    session.add_all([season, team, user])
    session.commit()

    session.add_all(
        [
            TeamMember(user_id=user.id, team_id=team.id, role="member"),
            TeamScore(team_id=team.id, season_id=season.id, points=10),
            TeamEventLog(team_id=team.id, user_id=user.id, season_id=season.id, action="BONUS", delta=10, meta=None),
        ]
    )
    session.commit()
    session.close()

    resp = client.delete(f"/admin/api/team-battle/teams/{team.id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

    session = session_factory()
    assert session.get(Team, team.id) is None
    assert session.query(TeamMember).filter(TeamMember.team_id == team.id).count() == 0
    assert session.query(TeamScore).filter(TeamScore.team_id == team.id).count() == 0
    assert session.query(TeamEventLog).filter(TeamEventLog.team_id == team.id).count() == 0
    session.close()
