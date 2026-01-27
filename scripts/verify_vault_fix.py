import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.api.deps import get_db
from app.v2.services.vault_service import V2VaultService
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.models.user import User
from app.v2.models.user import V2User
from app.v2.models.v2_dice import V2DiceLog
from app.models.vault_earn_event import VaultEarnEvent

def test_fix_verification():
    db = next(get_db())
    v2_vault = V2VaultService()
    
    # Use V2 user ID 1 (CC_ID: dev_vault_20260124, Legacy ID: 7)
    v2_user_id = 1
    v2_user = db.get(V2User, v2_user_id)
    if not v2_user:
        print("V2 User 1 not found")
        return

    from app.v2.services.user_service import V2UserService
    legacy_user_id = V2UserService.ensure_legacy_user_id(db, v2_user_id)
    print(f"--- Verification for V2 User {v2_user_id} (Legacy ID: {legacy_user_id}) ---")
    
    # 1. Verify ID mismatch fix in request_withdrawal
    print("\n[Test 1] Verifying request_withdrawal ID mismatch fix...")
    try:
        # We try to withdraw a large amount to trigger balance check but pass the User fetch check
        # Or just 10000. 
        # User 7 has some balance? Let's check.
        legacy_user = db.get(User, legacy_user_id)
        print(f"Legacy User Balance: {legacy_user.vault_locked_balance}")
        
        # If it doesn't raise 404 USER_NOT_FOUND, the fix worked.
        # It might raise 400 or 403 based on other rules, which is fine as long as it's not 404.
        res = v2_vault.request_withdrawal(db, user_id=v2_user_id, amount=10000)
        print(f"Request result: {res}")
    except Exception as e:
        print(f"Request result (likely expected failure): {e}")
        if "USER_NOT_FOUND" in str(e):
            print("[FAILED] ID Mismatch still exists!")
        else:
            print("[SUCCESS] fetch User correctly (no 404 USER_NOT_FOUND).")

    # 2. Verify Play Count Aggregation
    print("\n[Test 2] Verifying play count aggregation (including 0-accrual)...")
    
    # Get initial play count
    info_before = v2_vault.get_vault_info(db, v2_user_id)
    initial_count = info_before.get("daily_play_count", 0)
    print(f"Initial daily_play_count: {initial_count}")

    # Manually insert a 0-accrual play into v2_dice_log
    print("Inserting a mock play into v2_dice_log...")
    mock_log = V2DiceLog(
        user_id=v2_user_id,
        config_id=1,
        user_dice_1=1,
        user_dice_2=1,
        user_sum=2,
        dealer_dice_1=6,
        dealer_dice_2=6,
        dealer_sum=12,
        result="LOSE",
        reward_type="NONE",
        reward_amount=0,
        created_at=datetime.utcnow()
    )
    db.add(mock_log)
    db.commit()

    # Verify VaultEarnEvent is NOT created for this (should stay 0 if we don't call record_game_play_earn_event)
    # But even if it was called with 0, it wouldn't record.
    
    # Check count after
    info_after = v2_vault.get_vault_info(db, v2_user_id)
    final_count = info_after.get("daily_play_count", 0)
    print(f"Final daily_play_count: {final_count}")

    if final_count > initial_count:
        print("[SUCCESS] Play count correctly aggregated from v2_dice_log!")
    else:
        print("[FAILED] Play count did not increase.")

if __name__ == "__main__":
    test_fix_verification()
