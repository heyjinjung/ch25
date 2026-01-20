import pytest
from unittest.mock import MagicMock
from app.v2.services.golden_intervention_service import GoldenInterventionService

# Validates:
# - docs/v2_specs/05_ops/golden_v2_operational_logic_ko.md

def test_golden_lose_streak_trigger_logic():
    """Verify TRG_LOSE_5 logic: 5 consecutive losses triggers intervention."""
    mock_db = MagicMock()
    service = GoldenInterventionService(db=mock_db)
    # Bypass cooldown check
    service._is_on_cooldown = MagicMock(return_value=False)
    # Bypass retention update
    service._update_intervention_timestamp = MagicMock()

    # Case 1: 5 Consecutive Losses -> Trigger
    log = service.check_lose_streak_trigger(user_id=1, recent_results=["LOSE"]*5)
    assert log is not None
    assert log.trigger_id == "TRG_LOSE_5"
    assert "Last 5 game results" in log.trigger_condition

    # Case 2: 4 Consecutive Losses -> No Trigger
    log = service.check_lose_streak_trigger(user_id=1, recent_results=["LOSE"]*4)
    assert log is None

    # Case 3: Mixed Results -> No Trigger
    log = service.check_lose_streak_trigger(user_id=1, recent_results=["LOSE", "LOSE", "WIN", "LOSE", "LOSE"])
    assert log is None

def test_golden_balance_drop_trigger_logic():
    """Verify TRG_BAL_DROP_50 logic: 50% drop triggers intervention."""
    mock_db = MagicMock()
    service = GoldenInterventionService(db=mock_db)
    service._is_on_cooldown = MagicMock(return_value=False)
    service._update_intervention_timestamp = MagicMock()
    service._update_session_delta = MagicMock()

    # Case 1: 50% Drop (1000 -> 500) -> Trigger
    log = service.check_balance_drop_trigger(user_id=1, session_start_balance=1000, current_balance=500)
    assert log is not None
    assert log.trigger_id == "TRG_BAL_DROP_50"
    assert log.user_balance_before == 1000
    assert log.session_balance_delta == -500

    # Case 2: 40% Drop (1000 -> 600) -> No Trigger
    log = service.check_balance_drop_trigger(user_id=1, session_start_balance=1000, current_balance=600)
    assert log is None
