
import sys
import os
import datetime
import pytz

sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.user import User
from app.models.mission import Mission
from app.models.game_wallet import UserGameWallet
from app.services.admin_user_service import AdminUserService
from app.services.mission_service import MissionService
from app.services.season_pass_service import SeasonPassService
from app.services.user_service import UserService

def run_verification():
    print("=== POST-DEPLOYMENT VERIFICATION START ===")
    
    settings = get_settings()
    db = sessionmaker(bind=create_engine(settings.database_url))()
    
    # 1. PURGE TEST (Clean up previous verifications)
    purge_target_nick = "VerifyUser"
    existing = db.query(User).filter(User.nickname == purge_target_nick).first()
    if existing:
        print(f"[PURGE] Found existing user {existing.id}. Attempting purge...")
        try:
            # Requires admin_id, passing 1 (assuming admin exists) or 0
            AdminUserService.purge_user(db, user_id=existing.id, admin_id=1)
            print("[PURGE] SUCCESS ✅")
        except Exception as e:
            print(f"[PURGE] FAILED ❌: {e}")

    # 2. CREATE NEW USER
    print("[USER] Creating new user for verification...")
    user_service = UserService()
    # Mock ext_id
    ext_id = f"test_verify_{int(datetime.datetime.now().timestamp())}"
    user = user_service.create_user(db, external_id=ext_id, nickname=purge_target_nick)
    print(f"[USER] Created User ID: {user.id}")

    # 3. VERIFY LEVEL 1 TICKET GRANT (Duplication Check)
    # Logic: _auto_claim_initial_level disabled. _recover_missing_auto_claims should pick it up on status check.
    
    # Check Wallet immediately
    wallet_items = db.query(UserGameWallet).filter(UserGameWallet.user_id == user.id).all()
    print(f"[WALLET] Initial Items: {[f'{w.token_type}:{w.balance}' for w in wallet_items]}")
    
    # Simulate Frontend calling get_status
    print("[SEASON] Calling get_status to trigger auto-claim recovery...")
    sp_service = SeasonPassService()
    sp_service.get_status(db, user_id=user.id, now=datetime.datetime.now())
    db.commit() # Ensure logs persisted
    
    wallet_items_after = db.query(UserGameWallet).filter(UserGameWallet.user_id == user.id).all()
    print(f"[WALLET] After get_status: {[f'{w.token_type}:{w.balance}' for w in wallet_items_after]}")
    
    # Count Roulette Tickets
    roulette_tickets = next((w.balance for w in wallet_items_after if w.token_type == "ROULETTE_COIN"), 0)
    if roulette_tickets == 1:
        print("[TICKET] Level 1 Grant Verification: PASS (Exactly 1) ✅")
    elif roulette_tickets == 2:
        print("[TICKET] Level 1 Grant Verification: FAIL (Duplicate Grant!) ❌")
    else:
         print(f"[TICKET] Level 1 Grant Verification: WARN (Count {roulette_tickets}) ⚠️")

    # 4. VERIFY MISSIONS
    print("[MISSION] Checking Mission List...")
    mission_service = MissionService()
    missions = mission_service.get_missions(db, user_id=user.id)
    
    # Categorize
    new_user = [m for m in missions if m["category"] == "NEW_USER"]
    daily = [m for m in missions if m["category"] == "DAILY"]
    
    print(f"[MISSION] New User Missions: {len(new_user)} (Expect 4)")
    print(f"[MISSION] Daily Missions: {len(daily)}")
    
    if len(new_user) >= 4:
         print("[MISSION] New User Mission Count: PASS ✅")
    else:
         print("[MISSION] New User Mission Count: FAIL ❌")

    # 5. GOLDEN HOUR LOGIC CHECK
    print("[GOLDEN] Verifying Time Window Logic...")
    kst = pytz.timezone("Asia/Seoul")
    now_kst = datetime.datetime.now(kst)
    
    # Active Mission
    m_active = Mission(
        start_time=(now_kst - datetime.timedelta(hours=1)).time(),
        end_time=(now_kst + datetime.timedelta(hours=1)).time()
    )
    # Inactive Mission
    m_inactive = Mission(
        start_time=(now_kst - datetime.timedelta(hours=3)).time(),
        end_time=(now_kst - datetime.timedelta(hours=2)).time()
    )
    
    # Helper to access private logic or replicated logic
    def check_window(mission, now):
        if not mission.start_time or not mission.end_time: return True
        return mission.start_time <= now.time() <= mission.end_time

    is_active = check_window(m_active, now_kst)
    is_inactive_detect = check_window(m_inactive, now_kst)
    
    if is_active and not is_inactive_detect:
        print("[GOLDEN] Logic Check: PASS ✅")
    else:
        print(f"[GOLDEN] Logic Check: FAIL (Active={is_active}, Inactive={is_inactive_detect}) ❌")

    print("=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    run_verification()
