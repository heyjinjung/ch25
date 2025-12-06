# /workspace/ch25/tests/test_season_pass.py
"""Season pass endpoint integration tests with seeded data."""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.season_pass import SeasonPassConfig, SeasonPassLevel
from app.models.user import User


@pytest.fixture()
def seed_season(session_factory) -> None:
    session: Session = session_factory()
    today = date.today()

    user = User(id=1, external_id="tester", status="ACTIVE")
    season = SeasonPassConfig(
        season_name="TEST_SEASON",
        start_date=today - timedelta(days=1),
        end_date=today + timedelta(days=7),
        max_level=5,
        base_xp_per_stamp=10,
        is_active=True,
    )
    level1 = SeasonPassLevel(
        season=season,
        level=1,
        required_xp=0,
        reward_type="POINT",
        reward_amount=1,
        auto_claim=True,
    )
    level2 = SeasonPassLevel(
        season=season,
        level=2,
        required_xp=10,
        reward_type="POINT",
        reward_amount=5,
        auto_claim=False,
    )
    level3 = SeasonPassLevel(
        season=season,
        level=3,
        required_xp=15,
        reward_type="POINT",
        reward_amount=10,
        auto_claim=True,
    )
    session.add_all([user, season, level1, level2, level3])
    session.commit()
    session.close()


def test_season_pass_status(client: TestClient, seed_season) -> None:
    response = client.get("/api/season-pass/status")
    assert response.status_code == 200
    data = response.json()
    assert data["season"]["season_name"] == "TEST_SEASON"
    assert data["progress"]["current_level"] == 1


def test_stamp_and_claim_flow(client: TestClient, seed_season) -> None:
    stamp_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    assert stamp_resp.status_code == 200
    stamp_data = stamp_resp.json()
    assert stamp_data["xp_added"] == 10
    assert stamp_data["current_level"] >= 1

    # Second stamp on same day should fail
    dup_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    assert dup_resp.status_code == 400

    claim_resp = client.post("/api/season-pass/claim", json={"level": 2})
    assert claim_resp.status_code == 200
    claim_data = claim_resp.json()
    assert claim_data["level"] == 2
    assert claim_data["reward_type"] == "POINT"


def test_claim_before_progress_returns_error(client: TestClient, seed_season) -> None:
    response = client.post("/api/season-pass/claim", json={"level": 2})
    assert response.status_code == 400


def test_multi_level_up_auto_claims_rewards(client: TestClient, seed_season) -> None:
    # Add extra XP to cross multiple levels in one stamp
    stamp_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 10})
    assert stamp_resp.status_code == 200
    data = stamp_resp.json()
    # Should reach level 3 (base 10 + bonus 10 >= 15)
    assert data["current_level"] >= 3
    auto_rewards = [r for r in data["rewards"] if r["level"] == 3]
    assert auto_rewards, "Level 3 auto-claim reward should be granted"


def test_manual_claim_after_multi_level_gain(client: TestClient, seed_season) -> None:
    # Jump levels with bonus XP so manual level 2 claim remains available
    stamp_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 15})
    assert stamp_resp.status_code == 200
    claim_resp = client.post("/api/season-pass/claim", json={"level": 2})
    assert claim_resp.status_code == 200
    # Second claim should fail to prevent duplicates
    dup_claim = client.post("/api/season-pass/claim", json={"level": 2})
    assert dup_claim.status_code == 400


def test_no_active_season_returns_404(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE"))
    session.commit()
    session.close()

    resp = client.get("/api/season-pass/status")
    assert resp.status_code == 404

    stamp_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    assert stamp_resp.status_code == 404
