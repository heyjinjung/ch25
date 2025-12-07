# /workspace/ch25/tests/test_season_pass.py
"""Season pass endpoint integration tests with seeded data."""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.season_pass import (
    SeasonPassConfig,
    SeasonPassLevel,
    SeasonPassProgress,
    SeasonPassRewardLog,
    SeasonPassStampLog,
)
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


def test_duplicate_stamp_returns_error_code(client: TestClient, seed_season) -> None:
    client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    dup_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    assert dup_resp.status_code == 400
    data = dup_resp.json()
    assert data["error"]["code"] == "ALREADY_STAMPED_TODAY"


def test_stamp_writes_logs_and_progress_fk(client: TestClient, seed_season, session_factory) -> None:
    # Add XP to trigger multi-level-up and auto-claim reward logging
    stamp_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 15})
    assert stamp_resp.status_code == 200
    stamp_data = stamp_resp.json()
    assert stamp_data["current_level"] >= 3

    session: Session = session_factory()
    stamp_logs = session.query(SeasonPassStampLog).all()
    assert len(stamp_logs) == 1
    stamp_log = stamp_logs[0]
    assert stamp_log.progress_id is not None
    assert stamp_log.stamp_count == 1
    assert stamp_log.xp_earned == 25  # base 10 + bonus 15

    progress = session.query(SeasonPassProgress).filter_by(user_id=1, season_id=stamp_log.season_id).one()
    assert progress.current_level == 3
    assert progress.current_xp == 25

    reward_logs = session.query(SeasonPassRewardLog).filter_by(user_id=1, season_id=stamp_log.season_id).all()
    auto_levels = {log.level for log in reward_logs}
    assert auto_levels == {3}, "Level 3 auto-claim reward should be logged once"
    for log in reward_logs:
        assert log.progress_id == progress.id
    session.close()


def test_no_active_season_returns_404(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE"))
    session.commit()
    session.close()

    resp = client.get("/api/season-pass/status")
    assert resp.status_code == 404

    stamp_resp = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    assert stamp_resp.status_code == 404


def test_xmas_2025_season_date_range(session_factory) -> None:
    """Test that XMAS 2025 season (2025-12-09 ~ 2025-12-25) is correctly recognized.
    
    This verifies that the season is not restricted to 7 days but uses
    start_date/end_date for N-day flexible season configuration.
    """
    from app.services.season_pass_service import SeasonPassService
    
    session: Session = session_factory()
    
    # Create XMAS 2025 season with 17 days (2025-12-09 ~ 2025-12-25)
    xmas_season = SeasonPassConfig(
        season_name="XMAS_2025",
        start_date=date(2025, 12, 9),
        end_date=date(2025, 12, 25),
        max_level=5,
        base_xp_per_stamp=10,
        is_active=True,
    )
    session.add(xmas_season)
    session.commit()
    
    service = SeasonPassService()
    
    # Test dates within the season range
    test_dates = [
        date(2025, 12, 9),   # Start date
        date(2025, 12, 15),  # Middle
        date(2025, 12, 25),  # End date
    ]
    for test_date in test_dates:
        season = service.get_current_season(session, test_date)
        assert season is not None, f"Season should be active on {test_date}"
        assert season.season_name == "XMAS_2025"
    
    # Test dates outside the season range
    outside_dates = [
        date(2025, 12, 8),   # Day before start
        date(2025, 12, 26),  # Day after end
    ]
    for test_date in outside_dates:
        season = service.get_current_season(session, test_date)
        assert season is None, f"Season should NOT be active on {test_date}"
    
    session.close()


def test_season_conflict_raises_error(session_factory) -> None:
    """Test that overlapping seasons raise NO_ACTIVE_SEASON_CONFLICT error."""
    from fastapi import HTTPException
    from app.services.season_pass_service import SeasonPassService
    
    session: Session = session_factory()
    
    # Create two overlapping seasons
    season1 = SeasonPassConfig(
        season_name="SEASON_1",
        start_date=date(2025, 12, 1),
        end_date=date(2025, 12, 15),
        max_level=5,
        base_xp_per_stamp=10,
        is_active=True,
    )
    season2 = SeasonPassConfig(
        season_name="SEASON_2",
        start_date=date(2025, 12, 10),
        end_date=date(2025, 12, 20),
        max_level=5,
        base_xp_per_stamp=10,
        is_active=True,
    )
    session.add_all([season1, season2])
    session.commit()
    
    service = SeasonPassService()
    
    # Test date that overlaps both seasons
    overlap_date = date(2025, 12, 12)
    with pytest.raises(HTTPException) as exc_info:
        service.get_current_season(session, overlap_date)
    assert exc_info.value.status_code == 500
    assert "NO_ACTIVE_SEASON_CONFLICT" in exc_info.value.detail
    
    session.close()
