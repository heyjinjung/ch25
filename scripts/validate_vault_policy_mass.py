
import sys
import os
from datetime import datetime
from collections import Counter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user import User
from app.services.vault_service import VaultService

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def validate_mass_policy():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total Users Found: {len(users)}\n")
        
        vs = VaultService()
        now = datetime.utcnow()
        
        stats = Counter()
        inactive_samples = []
        active_no_ledger_samples = [] # Users active purely due to External Ranking
        
        print(f"{'ID':<6} {'Nickname':<15} {'TotalCharge':<12} {'LastDep':<20} {'Status':<10} {'Suspended'}")
        print("-" * 80)

        for user in users:
            # We want to see if the new logic (ExternalRanking) is saving people.
            # But get_user_vault_policy encapsulates it.
            policy = vs.get_user_vault_policy(db, user, now)
            status = policy['status']
            suspended = policy['benefits_suspended']
            
            stats[status] += 1
            if suspended:
                stats['SUSPENDED'] += 1
                
            # Capture samples
            if status == 'INACTIVE' and len(inactive_samples) < 5:
                # Get last deposit date for display
                last_dep = vs._get_last_deposit_date(db, user.id)
                inactive_samples.append({
                    'id': user.id,
                    'nick': user.nickname,
                    'total': user.total_charge_amount,
                    'last_dep': str(last_dep),
                    'status': status
                })

            # Print concise line for first 50 or if interesting
            # (Limiting print to avoid massive console spam, but maybe user wants to see list?)
            # prompt said "Test all users", usually implies summary + check.
            pass

        print("\n" + "="*40)
        print("SUMMARY STATISTICS")
        print("="*40)
        for k, v in stats.items():
            print(f"{k}: {v}")
            
        print("\n" + "="*40)
        print("INACTIVE SAMPLE (First 5)")
        print("="*40)
        for s in inactive_samples:
             print(f"User {s['id']} ({s['nick']}) | Total: {s['total']:,} | LastDep: {s['last_dep']}")

    finally:
        db.close()

if __name__ == "__main__":
    validate_mass_policy()
