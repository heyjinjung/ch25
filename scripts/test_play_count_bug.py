import os
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.api.deps import get_db
from app.v2.services.vault_service import V2VaultService
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.models.user import User
from app.v2.models.v2_dice import V2DiceLog
from app.models.vault_earn_event import VaultEarnEvent

def test_play_count_missing():
    db = next(get_db())
    v2_vault = V2VaultService()
    v2_dice = V2DiceGameService()
    
    # Use V2 user ID 1
    v2_user_id = 1
    
    # Get initial play count
    info_before = v2_vault.get_vault_info(db, v2_user_id)
    initial_count = info_before.get("recent_play_count", 0)
    print(f"Initial recent_play_count from get_vault_info: {initial_count}")

    # Get legacy user_id for direct query
    from app.v2.services.user_service import V2UserService
    legacy_user_id = V2UserService.ensure_legacy_user_id(db, v2_user_id)
    print(f"Legacy User ID: {legacy_user_id}")

    # Check VaultEarnEvent count directly
    v_event_count_before = db.query(VaultEarnEvent).filter(
        VaultEarnEvent.user_id == legacy_user_id,
        VaultEarnEvent.earn_type == "GAME_PLAY"
    ).count()
    print(f"Direct VaultEarnEvent count: {v_event_count_before}")

    # Simulate a game play (v2_dice.play)
    # We'll use a mock if needed, but let's try calling it if we have tokens
    # Or we can just manually record a vault event via the service and see what happens
    
    print("\nSimulating a 0-amount vault accrual via vault_service.record_game_play_earn_event...")
    added = v2_vault.record_game_play_earn_event(
        db,
        user_id=v2_user_id,
        game_type="DICE",
        game_log_id=999999,
        outcome="LOSE",
        payout_raw={"reward_amount": 0, "reward_type": "NONE"}
    )
    db.commit()
    print(f"Amount added to vault: {added}")

    # Check play count after
    info_after = v2_vault.get_vault_info(db, v2_user_id)
    final_count = info_after.get("recent_play_count", 0)
    print(f"Final recent_play_count from get_vault_info: {final_count}")

    v_event_count_after = db.query(VaultEarnEvent).filter(
        VaultEarnEvent.user_id == legacy_user_id,
        VaultEarnEvent.earn_type == "GAME_PLAY"
    ).count()
    print(f"Direct VaultEarnEvent count after: {v_event_count_after}")

    if final_count == initial_count:
        print("\n[CONFIRMED] Play was NOT counted because it had 0 vault accrual.")
    else:
        print("\n[FAILED] Play was counted.")

    print("\nTesting request_withdrawal for ID mismatch...")
    try:
        # This will fail if it uses the wrong ID to fetch User
        res = v2_vault.request_withdrawal(db, user_id=v2_user_id, amount=10000)
        print(f"Request result: {res}")
    except Exception as e:
        print(f"Request failed: {e}")
        # If it fails with 404 or points to wrong user, we confirmed mismatch
        if "USER_NOT_FOUND" in str(e):
            print("[CONFIRMED] ID Mismatch in request_withdrawal: It tried to db.get(User, v2_user_id) but V2 ID != Legacy ID.")

if __name__ == "__main__":
    test_play_count_missing()
