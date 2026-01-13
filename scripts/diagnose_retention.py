
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text, func, select

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData

def run_diagnostics():
    db = SessionLocal()
    print("=== RETENTION DIAGNOSTICS REPORT ===")
    print(f"Time: {datetime.utcnow()}")
    
    try:
        # 1. Basic User Stats
        total_users = db.query(User).count()
        new_users_24h = db.query(User).filter(User.created_at >= datetime.utcnow() - timedelta(days=1)).count()
        active_users_24h = db.query(User).filter(User.last_login_at >= datetime.utcnow() - timedelta(days=1)).count()
        
        print(f"\n[Basic Stats]")
        print(f"Total Users: {total_users}")
        print(f"New Users (24h): {new_users_24h}")
        print(f"Active Users (24h): {active_users_24h}")

        # 2. Activity Check (Last Play Date)
        # Using User.last_play_date as proxy
        played_24h = db.query(User).filter(User.last_play_date >= datetime.utcnow().date() - timedelta(days=1)).count()
        print(f"Users Played (24h): {played_24h}")

        # 3. Crisis Scenario Checks (Replicating Logic)
        print(f"\n[Crisis Scenarios Check]")
        
        # Scenario 1: Unlucky Newbie (Joined 24h, 0 balance)
        s1_cutoff = datetime.utcnow() - timedelta(days=1)
        s1_candidates = db.query(User).filter(User.created_at >= s1_cutoff, User.vault_balance == 0).count()
        print(f"Scenario 1 Candidates (Newbie & Broke): {s1_candidates}")

        # Scenario 4: Sleeping Vault (Inactive 7d+, Balance > 10k)
        s4_cutoff = datetime.utcnow() - timedelta(days=7)
        s4_candidates = db.query(User).filter(User.last_login_at < s4_cutoff, User.vault_balance > 10000).count()
        print(f"Scenario 4 Candidates (Sleeping Rich): {s4_candidates}")

        # Scenario 11: External VIP
        s11_cutoff = datetime.utcnow() - timedelta(days=7)
        s11_candidates = db.query(ExternalRankingData).filter(
            ExternalRankingData.deposit_amount >= 1000000, 
            ExternalRankingData.updated_at >= s11_cutoff
        ).count()
        print(f"Scenario 11 Candidates (External VIP): {s11_candidates}")

        # 4. Check Ops Usage
        result = db.execute(text("SELECT count(*) FROM ops_target_list")).scalar()
        print(f"\n[Ops Usage]")
        print(f"Total Target Lists Created: {result}")

    except Exception as e:
        print(f"Error during diagnostics: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_diagnostics()
