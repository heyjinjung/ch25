
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import func

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData

def test_segmentation_logic():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        
        print(f"--- Segmentation Logic Test ({now.strftime('%Y-%m-%d %H:%M:%S')} UTC) ---")
        print(f"Criterion for NEW: Created at or after {seven_days_ago.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Criterion for WHALE: Deposit >= 5,000,000\n")
        
        # 1. Total count
        total_users = db.query(func.count(User.id)).scalar()
        
        # 2. Detailed fetch
        users = db.query(User).all()
        rankings = {r.user_id: r.deposit_amount for r in db.query(ExternalRankingData).all()}
        
        segments = {
            "NEW": [],
            "WHALE": [],
            "COMMON": []
        }
        
        for user in users:
            # Replicating _resolve_user_grade logic
            if user.created_at >= seven_days_ago:
                segments["NEW"].append(user.id)
                continue
                
            deposit = rankings.get(user.id, 0)
            if deposit >= 5000000:
                segments["WHALE"].append(user.id)
                continue
                
            segments["COMMON"].append(user.id)
            
        print(f"Total Users Found: {total_users}")
        print(f"NEW count: {len(segments['NEW'])} -> IDs: {segments['NEW'][:10]}{'...' if len(segments['NEW']) > 10 else ''}")
        print(f"WHALE count: {len(segments['WHALE'])} -> IDs: {segments['WHALE']}")
        print(f"COMMON count: {len(segments['COMMON'])} -> IDs: {segments['COMMON'][:10]}{'...' if len(segments['COMMON']) > 10 else ''}")
        
        # Sample check for WHALE if exists
        if segments["WHALE"]:
            whale_id = segments["WHALE"][0]
            w_user = db.get(User, whale_id)
            print(f"\n[Sample check: WHALE ID {whale_id}]")
            print(f"  Created At: {w_user.created_at}")
            print(f"  Deposit: {rankings.get(whale_id, 0):,} 원")
            
        # Sample check for NEW if exists
        if segments["NEW"]:
            new_id = segments["NEW"][0]
            n_user = db.get(User, new_id)
            print(f"\n[Sample check: NEW ID {new_id}]")
            print(f"  Created At: {n_user.created_at}")
            print(f"  Deposit: {rankings.get(new_id, 0):,} 원")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_segmentation_logic()
