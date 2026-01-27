from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.db.base_class import Base
from app.main import app
from app.v2.api.deps import get_current_user_id as get_current_v2_user_id
from app.v2.services.user_service import V2UserService


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    import app.db.base  # noqa: F401
    import app.v2.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def seed_session(test_engine) -> Session:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(test_engine) -> TestClient:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.pop(get_db, None)


def _override_v2_auth(v2_user_id: int) -> None:
    app.dependency_overrides[get_current_v2_user_id] = lambda: v2_user_id


def _clear_v2_auth_override() -> None:
    app.dependency_overrides.pop(get_current_v2_user_id, None)


def test_v2_team_battle_payloads(client: TestClient, seed_session: Session) -> None:
    from app.models.team_battle import Team, TeamSeason, TeamScore

    # Seed V2 user and ensure legacy mapping exists.
    v2_user = V2UserService.create_user(seed_session, cc_id="tb-test-user", nickname="TB")
    seed_session.commit()
    legacy_user_id = V2UserService.ensure_legacy_user_id(seed_session, int(v2_user.id))
    seed_session.commit()

    now = datetime.utcnow()

    # Seed active season + 2 teams + scores
    season = TeamSeason(
        name="S1",
        starts_at=now - timedelta(hours=1),
        ends_at=now + timedelta(days=1),
        is_active=True,
    )
    seed_session.add(season)
    seed_session.flush()

    team_a = Team(name="RED", is_active=True)
    team_b = Team(name="BLUE", is_active=True)
    seed_session.add_all([team_a, team_b])
    seed_session.flush()

    seed_session.add_all(
        [
            TeamScore(team_id=team_a.id, season_id=season.id, points=10),
            TeamScore(team_id=team_b.id, season_id=season.id, points=20),
        ]
    )
    seed_session.commit()

    _override_v2_auth(int(v2_user.id))
    try:
        resp = client.get("/api/v2/team-battle/seasons/active")
        assert resp.status_code == 200, resp.text
        season_payload = resp.json()
        assert season_payload["id"] == season.id
        assert season_payload["start_date"]
        assert season_payload["end_date"]

        resp = client.get("/api/v2/team-battle/teams")
        assert resp.status_code == 200, resp.text
        teams = resp.json()
        assert isinstance(teams, list)
        assert len(teams) >= 2
        assert set(teams[0].keys()) >= {"id", "name", "member_count", "max_members", "total_score"}

        resp = client.post("/api/v2/team-battle/teams/auto-assign")
        assert resp.status_code == 200, resp.text
        join_payload = resp.json()
        assert join_payload["user_id"] == legacy_user_id
        assert join_payload["team_id"] in {team_a.id, team_b.id}

        resp = client.get("/api/v2/team-battle/teams/me")
        assert resp.status_code == 200, resp.text
        me_payload = resp.json()
        assert me_payload["has_team"] is True
        assert me_payload["team"] is not None
        assert me_payload["membership"] is not None

        resp = client.get("/api/v2/team-battle/teams/leaderboard")
        assert resp.status_code == 200, resp.text
        lb = resp.json()
        assert "entries" in lb
        assert "season_id" in lb
        assert lb["season_id"] == season.id

        resp = client.get("/api/v2/team-battle/status")
        assert resp.status_code == 200, resp.text
        status_payload = resp.json()
        assert status_payload["season_name"] == season.name
        assert status_payload["season"]["id"] == season.id
        assert "top_teams" in status_payload
        assert isinstance(status_payload["top_teams"], list)
        assert status_payload["has_team"] is True
        assert status_payload["my_team"] is not None

        resp = client.get("/api/v2/team-battle/rankings")
        assert resp.status_code == 200, resp.text
        rankings_payload = resp.json()
        assert "entries" in rankings_payload
        assert "season_id" in rankings_payload

    finally:
        _clear_v2_auth_override()
