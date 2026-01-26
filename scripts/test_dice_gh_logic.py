
import sys
import os
from unittest.mock import MagicMock, patch
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.schemas.dice import DiceStatusResponse, DicePlayResponse

def test_dice_golden_hour_logic():
    print("Starting Dice Golden Hour Logic Test...")
    service = V2DiceGameService()
    db = MagicMock()
    
    # Mocking dependencies for get_status
    with patch("app.v2.services.game_config_service.V2GameConfigService.get_active_dice_config") as mock_config:
        config = MagicMock()
        config.id = 1
        config.name = "Test Dice"
        config.ticket_type = "DICE_TICKET"
        # Mocking all necessary attributes from DiceConfig model
        config.win_probability = 0.4
        config.draw_probability = 0.1
        config.lose_probability = 0.5
        config.win_reward_type = "POINT"
        config.win_reward_amount = 100
        config.draw_reward_type = "POINT"
        config.draw_reward_amount = 50
        config.lose_reward_type = "POINT"
        config.lose_reward_amount = 0
        config.enable_golden_hour = True
        config.golden_hour_multiplier = 2.0
        
        mock_config.return_value = config
        
        with patch("app.v2.services.event_service.V2EventService.is_golden_hour") as mock_gh:
            mock_gh.return_value = True
            
            # 1. Test get_status
            print("Testing get_status...")
            status = service.get_status(db, user_id=123)
            print(f"Status is_golden_hour: {status.is_golden_hour}")
            assert status.is_golden_hour is True
            
            # 2. Test play
            print("Testing play...")
            # Need to mock more for play() as it interacts with inventory, logs, etc.
            with patch("app.v2.services.inventory_service.V2InventoryService.require_and_consume_wallet_token"):
                with patch("app.v2.services.vault_service.V2VaultService.record_game_play_earn_event") as mock_vault:
                    mock_vault.return_value = 100
                    with patch("app.v2.services.mission_service.V2MissionService.update_progress"):
                        with patch("app.v2.services.mission_service.V2MissionService.get_streak_info") as mock_streak:
                            mock_streak.return_value = None
                            with patch("app.v2.services.game_common.log_game_play"):
                                with patch("app.v2.services.reward_service.V2RewardService.deliver"):
                                    # Simulate WIN to see if golden active is used
                                    response = service.play(db, user_id=123)
                                    print(f"Play response is_golden_hour: {response.is_golden_hour}")
                                    assert response.is_golden_hour is True

    print("Dice Golden Hour Logic Test PASSED ✅")

if __name__ == "__main__":
    try:
        test_dice_golden_hour_logic()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
