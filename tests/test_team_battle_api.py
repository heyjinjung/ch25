"""Team battle API tests for public and admin flows."""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet


@pytest.fixture()
def seed_active_season_with_teams(session_factory):
    """Seed an active season with two teams and initial scores."""

    session: Session = session_factory()
    now = datetime.utcnow()
    season = TeamSeason(
        name="Season One",
        starts_at=now - timedelta(hours=1),
        ends_at=now + timedelta(days=1),
        is_active=True,
    )
    alpha = Team(name="Alpha", is_active=True)
    beta = Team(name="Beta", is_active=True)
    session.add_all([season, alpha, beta])
    session.commit()
    session.add_all(
        [
            TeamScore(team_id=alpha.id, season_id=season.id, points=100),
            TeamScore(team_id=beta.id, season_id=season.id, points=50),
        ]
    )
    session.commit()
    session.close()
    return {"season_id": season.id, "alpha_id": alpha.id, "beta_id": beta.id}


@pytest.fixture()
def seed_leader_user(session_factory):
    """Seed a leader user for admin-managed teams."""

    session: Session = session_factory()
    leader = User(id=99, external_id="leader-99", status="ACTIVE")
    session.add(leader)
    session.commit()
    session.close()
    return leader.id


@pytest.mark.usefixtures("seed_active_season_with_teams")
def test_join_and_leave_team_flow(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    team_id = session.query(Team.id).filter(Team.name == "Alpha").scalar()
    session.close()

    resp = client.post("/api/team-battle/teams/join", json={"team_id": team_id})
    assert resp.status_code == 200
    assert resp.json()["team_id"] == team_id

    session = session_factory()
    member = session.get(TeamMember, 1)
    assert member is not None and member.team_id == team_id
    session.close()

    resp_repeat = client.post("/api/team-battle/teams/join", json={"team_id": team_id})
    assert resp_repeat.status_code == 200

    leave = client.post("/api/team-battle/teams/leave")
    assert leave.status_code == 200
    assert leave.json()["left"] is True

    session = session_factory()
    assert session.get(TeamMember, 1) is None
    session.close()

    leave_missing = client.post("/api/team-battle/teams/leave")
    assert leave_missing.status_code == 404


@pytest.mark.usefixtures("seed_active_season_with_teams")
def test_leaderboard_orders_by_points(client: TestClient, session_factory) -> None:
    resp = client.get("/api/team-battle/teams/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    assert data[0]["points"] >= data[1]["points"]

    session: Session = session_factory()
    alpha_id = session.query(Team.id).filter(Team.name == "Alpha").scalar()
    beta_id = session.query(Team.id).filter(Team.name == "Beta").scalar()
    session.close()
    assert [data[0]["team_id"], data[1]["team_id"]] == [alpha_id, beta_id]


def test_admin_create_activate_and_award_points(client: TestClient, session_factory, seed_leader_user: int) -> None:
    now = datetime.utcnow()
    create_season = client.post(
        "/admin/api/team-battle/seasons",
        json={
            "name": "Season Admin",
            "starts_at": (now - timedelta(days=1)).isoformat(),
            "ends_at": (now + timedelta(days=1)).isoformat(),
            "is_active": False,
            "rewards_schema": {"tier": "gold"},
        },
    )
    assert create_season.status_code == 200
    season_id = create_season.json()["id"]

    activate = client.post(f"/admin/api/team-battle/seasons/{season_id}/active", params={"is_active": True})
    assert activate.status_code == 200
    assert activate.json()["is_active"] is True

    active_resp = client.get("/api/team-battle/seasons/active")
    assert active_resp.status_code == 200
    assert active_resp.json()["id"] == season_id

    create_team = client.post(
        "/admin/api/team-battle/teams",
        params={"leader_user_id": seed_leader_user},
        json={"name": "Admin Team", "icon": None},
    )
    assert create_team.status_code == 200
    team_id = create_team.json()["id"]

    add_points = client.post(
        "/admin/api/team-battle/teams/points",
        json={
            "team_id": team_id,
            "delta": 25,
            "action": "BONUS",
            "user_id": seed_leader_user,
            "season_id": season_id,
            "meta": {"source": "test"},
        },
    )
    assert add_points.status_code == 200
    assert add_points.json()["points"] == 25

    session: Session = session_factory()
    member = session.get(TeamMember, seed_leader_user)
    assert member is not None and member.role == "leader" and member.team_id == team_id

    score = session.query(TeamScore).filter_by(team_id=team_id, season_id=season_id).one()
    assert score.points == 25

    log = session.query(TeamEventLog).filter_by(team_id=team_id, season_id=season_id, action="BONUS").one()
    assert log.delta == 25 and log.user_id == seed_leader_user
    session.close()


@pytest.mark.usefixtures("seed_active_season_with_teams")
def test_daily_limit_enforced(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    team_id = session.query(Team.id).filter(Team.name == "Alpha").scalar()
    season_id = session.query(TeamSeason.id).scalar()
    session.close()

    # DAILY_POINT_CAP=500 and POINTS_PER_PLAY=10 => 50 plays allowed per day.
    for _ in range(50):
        resp = client.post(
            "/admin/api/team-battle/teams/points",
            json={"team_id": team_id, "delta": 1, "action": "GAME_PLAY", "user_id": 1, "season_id": season_id, "meta": None},
        )
        assert resp.status_code == 200

    resp = client.post(
        "/admin/api/team-battle/teams/points",
        json={"team_id": team_id, "delta": 1, "action": "GAME_PLAY", "user_id": 1, "season_id": season_id, "meta": None},
    )
    assert resp.status_code == 429


def test_settle_rewards_with_tiebreaker(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    now = datetime.utcnow()
    season = TeamSeason(
        name="Daily", starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1), is_active=True
    )
    t1 = Team(name="Team A", is_active=True)
    t2 = Team(name="Team B", is_active=True)
    u1 = User(id=10, external_id="u10", status="ACTIVE")
    u2 = User(id=20, external_id="u20", status="ACTIVE")
    session.add_all([season, t1, t2, u1, u2])
    session.commit()
    session.add_all(
        [
            TeamMember(user_id=u1.id, team_id=t1.id, role="member"),
            TeamMember(user_id=u2.id, team_id=t2.id, role="member"),
            TeamScore(team_id=t1.id, season_id=season.id, points=5),
            TeamScore(team_id=t2.id, season_id=season.id, points=5),
        ]
    )
    session.commit()

    # Tiebreaker by latest event time: make Team B latest
    earlier = now - timedelta(minutes=5)
    later = now - timedelta(minutes=1)
    session.add_all(
        [
            TeamEventLog(team_id=t1.id, season_id=season.id, user_id=u1.id, action="GAME_PLAY", delta=1, created_at=earlier),
            TeamEventLog(team_id=t2.id, season_id=season.id, user_id=u2.id, action="GAME_PLAY", delta=1, created_at=later),
        ]
    )
    session.commit()
    session.close()

    resp = client.post(f"/admin/api/team-battle/seasons/{season.id}/settle")
    assert resp.status_code == 200
    data = resp.json()
    assert data["rank1"]["team_id"] == t2.id
