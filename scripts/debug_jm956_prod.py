import sys
import os
sys.path.append('/app')

from app.core.database import SessionLocal
from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.services.vault_service import VaultService
from datetime import datetime, timezone

# Setup DB
db = SessionLocal()
try:
    print("## Debugging User jm956")
    u = db.query(User).filter(User.nickname == 'jm956').first()
    if not u:
        print("User NOT FOUND by nickname 'jm956'")
        u = db.query(User).filter(User.external_id.ilike('%jm956%')).first()
    
    if u:
        print(f"User Found: ID={u.id}, Nick={u.nickname}, ExtID={u.external_id}")
        
        # Check Rank
        rank = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == u.id).first()
        if rank:
            print(f"Rank Data: Deposit={rank.deposit_amount}, UpdatedAt(UTC)={rank.updated_at}")
            
            # Check Policy
            v = VaultService()
            try:
                policy = v.get_user_vault_policy(db, u, datetime.utcnow())
                print(f"Vault Policy: {policy}")
            except Exception as e:
                print(f"Vault Policy Error: {e}")

            # Manual Withdrawal Logic Check
            if rank.deposit_amount <= 0:
                print("FAIL: Deposit Amount <= 0")
            else:
                from zoneinfo import ZoneInfo
                tz = ZoneInfo("Asia/Seoul")
                if rank.updated_at.tzinfo is None:
                    sync_dt = rank.updated_at.replace(tzinfo=timezone.utc)
                else:
                    sync_dt = rank.updated_at
                
                sync_kst = sync_dt.astimezone(tz).date()
                now_kst = datetime.now(tz).date()
                print(f"Sync Date (KST): {sync_kst}")
                print(f"Today (KST): {now_kst}")
                
                if sync_kst == now_kst:
                    print("PASS: Date Matches Today")
                else:
                    print("FAIL: Date Mismatch")
        else:
            print("No ExternalRankingData found.")
    else:
        print("User completely not found.")

finally:
    db.close()
