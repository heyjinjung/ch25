import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from app.services.vault_service import VaultService
from app.models.game_wallet import GameTokenType

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = 1
    user.vault_locked_balance = 0
    return user

@patch("app.services.vault_service.VaultService._eligible", return_value=True)
@patch("app.services.vault_service.VaultService._get_or_create_user")
@patch("app.services.vault_service.VaultService.vault_accrual_multiplier", return_value=1.0)
@patch("app.services.vault_service.get_settings")
@patch("app.services.vault2_service.Vault2Service.get_config_value")
def test_roulette_vault_cleanup(mock_get_config, mock_settings_cls, mock_multiplier, mock_get_user, mock_eligible, mock_db, mock_user):
    """
    Verify that the hardcoded Roulette Vault rewards (+200 / -50) are effectively removed.
    They should now default to 0 unless specifically configured in DB.
    """
    # 1. Mock Settings
    mock_settings = MagicMock()
    mock_settings.enable_vault_game_earn_events = True
    mock_settings.vault_accrual_multiplier_enabled = False
    mock_settings_cls.return_value = mock_settings

    # 2. Configure get_config_value side effect
    # Note: When patching the method directly, 'self' is passed as first arg in *args? 
    # Usually patch replaces the bound method, so 'self' might be handling.
    # Let's check args robustly.
    # Side effect:
    # - "enable_game_earn_events": Return None => Fallback to Settings (True)
    # - "caps": Return {} => Safe
    # - "game_earn_config": Return {} => Safe (Avoids AttributeError)
    def get_config_side_effect(*args, **kwargs):
        # If explicitly asking for enable flag, return None to trigger fallback
        if "enable_game_earn_events" in args:
             return None
        # For everything else (caps, game_earn_config), return empty dict
        return {}
    mock_get_config.side_effect = get_config_side_effect

    service = VaultService()
    mock_get_user.return_value = mock_user

    # 3. Mock DB Idempotency
    # Ensure idempotency check returns None (not found)
    # db.execute(...).first() -> None
    mock_result = MagicMock()
    mock_result.first.return_value = None
    mock_result.scalar.return_value = 0 # For caps check
    mock_db.execute.return_value = mock_result

    # Test Case 1: Roulette WIN (Legacy was +200)
    # New logic: IF reward_amount > 0 AND type is POINT -> amount
    # IF reward_amount == 0 -> 0 (previously -50 or 0)
    # IF reward_amount > 0 BUT type is Ticket/XP -> 0 (previously +200)

    # 1-1. Ticket Reward (Should be 0, legacy was +200)
    payout_ticket = {"reward_type": "TICKET", "reward_amount": 1}
    accrual = service.record_game_play_earn_event(
        mock_db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=101,
        outcome="WIN",
        payout_raw=payout_ticket,
        now=datetime.now(timezone.utc)
    )
    assert accrual == 0, f"Ticket reward accrual: {accrual} != 0"

    # 1-2. XP Reward (Should be 0, legacy was +200)
    payout_xp = {"reward_type": "GAME_XP", "reward_amount": 500}
    accrual = service.record_game_play_earn_event(
        mock_db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=102,
        outcome="WIN",
        payout_raw=payout_xp,
        now=datetime.now(timezone.utc)
    )
    assert accrual == 0, f"XP reward accrual: {accrual} != 0"

    # 1-3. Zero/Lose (Should be 0, legacy was -50)
    payout_lose = {"reward_type": "NONE", "reward_amount": 0}
    accrual = service.record_game_play_earn_event(
        mock_db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=103,
        outcome="LOSE",
        payout_raw=payout_lose,
        now=datetime.now(timezone.utc)
    )
    assert accrual == 0, f"Lose/Zero reward accrual: {accrual} != 0"

    # 1-4. Point Reward (Should accrue literally)
    payout_point = {"reward_type": "POINT", "reward_amount": 1000}
    accrual = service.record_game_play_earn_event(
        mock_db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=104,
        outcome="WIN",
        payout_raw=payout_point,
        now=datetime.now(timezone.utc)
    )
    assert accrual == 1000, f"Point reward accrual: {accrual} != 1000"

if __name__ == "__main__":
    pass
