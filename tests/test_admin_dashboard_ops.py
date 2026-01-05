import pytest
from datetime import datetime, timedelta, time
from sqlalchemy.orm import Session
from app.services.admin_dashboard_service import AdminDashboardService
from app.models.user import User
from app.models.mission import UserMissionProgress, Mission
from app.models.vault_earn_event import VaultEarnEvent
from app.models.user_cash_ledger import UserCashLedger
from app.models.dice import DiceLog

@pytest.fixture
def dashboard_service():
    return AdminDashboardService()

@pytest.fixture
def db(session_factory):
    session = session_factory()
    yield session
    session.close()

def test_daily_overview_structure(db: Session, dashboard_service: AdminDashboardService):
    """Test that get_daily_overview returns the expected dictionary structure."""
    # We don't need extensive data seeding for structure check,
    # but let's ensure it doesn't crash on empty db

    result = dashboard_service.get_daily_overview(db)

    # New comprehensive structure keys
    assert "welcome_retention_rate" in result
    assert "churn_risk_count" in result
    assert "external_ranking_deposit" in result
    assert "external_ranking_play_count" in result
    assert "today_deposit_sum" in result
    assert "today_deposit_count" in result
    assert "total_vault_balance" in result
    assert "total_inventory_liability" in result
    assert "today_active_users" in result
    assert "today_game_plays" in result
    assert "streak_counts" in result

    # Check types
    assert isinstance(result["welcome_retention_rate"], float)
    assert isinstance(result["churn_risk_count"], int)
    assert isinstance(result["streak_counts"], dict)

def test_event_status_structure(db: Session, dashboard_service: AdminDashboardService):
    """Test that get_event_status returns the expected structure."""

    result = dashboard_service.get_event_status(db)

    assert "welcome_metrics" in result
    assert "streak_counts" in result
    assert "golden_hour_peak" in result
    assert "is_golden_hour_active" in result

    assert isinstance(result["welcome_metrics"], list)
    assert isinstance(result["streak_counts"], dict)
    assert isinstance(result["golden_hour_peak"], int)
    assert isinstance(result["is_golden_hour_active"], bool)

    # Check Welcome Metrics Content
    if result["welcome_metrics"]:
        item = result["welcome_metrics"][0]
        assert "label" in item
        assert "value" in item

    # Check Streak Counts Keys
    assert "NORMAL" in result["streak_counts"]
    assert "HOT" in result["streak_counts"]
    assert "LEGEND" in result["streak_counts"]

def test_risk_logic_mock(db: Session, dashboard_service: AdminDashboardService):
    """Simple logic test with seeded data."""
    # Create a user and verify query runs without error.
    user = User(external_id="dashboard_test_user", play_streak=5)
    db.add(user)
    db.commit()

    result = dashboard_service.get_daily_overview(db)
    # New key name
    assert result["churn_risk_count"] >= 0

def test_nudge_risk_group(db: Session, dashboard_service: AdminDashboardService):
    count = dashboard_service.nudge_risk_group(db)
    assert isinstance(count, int)
    assert count >= 0

