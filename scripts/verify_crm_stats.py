import sys
import os
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData
from app.models.vault_earn_event import VaultEarnEvent
from app.services.user_segment_service import UserSegmentService
from app.models.admin_user_profile import AdminUserProfile

def verify_crm_stats():
    db = SessionLocal()
    try:
        print("=== [CRM Data Verification Start] ===")
        
        # 1. Manual User Counts
        total_users = db.query(User).count()
        print(f"1. Total Users (DB): {total_users}")
        
        now = datetime.utcnow()
        active_threshold = now - timedelta(days=7)
        active_users = db.query(User).filter(User.last_login_at >= active_threshold).count()
        print(f"2. Active Users (7d) (DB): {active_users}")

        # 3. External Rankings (Deposits)
        ext_ranks = db.query(ExternalRankingData).all()
        print(f"3. ExternalRankingData Count: {len(ext_ranks)}")
        total_deposit = sum([r.deposit_amount or 0 for r in ext_ranks])
        print(f"   Sum Deposit: {total_deposit}")
        total_play = sum([r.play_count or 0 for r in ext_ranks])
        print(f"   Sum Play Count: {total_play}")

        # 4. Imported Profile Metrics (Avg Active Days)
        profiles = db.query(AdminUserProfile).all()
        print(f"4. AdminProfiles Count: {len(profiles)}")
        days_list = [p.total_active_days for p in profiles if p.total_active_days is not None]
        print(f"   Profiles with 'total_active_days': {len(days_list)}")
        if days_list:
            print(f"   Avg Active Days (Manual): {sum(days_list)/len(days_list)}")
        else:
            print(f"   Avg Active Days (Manual): 0 (No data)")

        # 5. Service Call
        print("\n--- [Service Response Check] ---")
        stats = UserSegmentService.get_overall_stats(db)
        print("Service returned:")
        for k, v in stats.items():
            print(f"  {k}: {v}")

        # 6. Verification
        print("\n--- [Verification Result] ---")
        if stats.get('total_deposit_amount') == total_deposit:
             print("✅ Total Deposit Matches")
        else:
             print(f"❌ Total Deposit Mismatch! Service: {stats.get('total_deposit_amount')} vs DB: {total_deposit}")
             
        if stats.get('total_users') == total_users:
             print("✅ Total Users Matches")
        else:
             print("❌ Total Users Mismatch!")

        print("=== [CRM Data Verification End] ===")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_crm_stats()
