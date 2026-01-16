import sys
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

# Add project root to path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.schemas.external_ranking import ExternalRankingCreate

# Data from request
# Format: Nickname -> List of Amounts
raw_data = [
    ("신이다요", 40000),
    ("돈따묵쟈", 50000),
    ("돈따묵쟈", 50000),
    ("돈따묵쟈", 50000),
    ("기프트", 200000),
    ("효시리", 100000),
    ("아사카", 100000),
    ("봄꽃잎", 200000),
    ("정우성", 200000),
    ("정우성", 200000), # 10:54
    ("봄꽃잎", 200000), # 09:14
    ("민똘이", 300000),
    ("percipic", 60000), # Corrected from persipic
    ("아사카", 100000), # 01:13
]

# Aliases for known typos (from request -> database)
aliases = {
    "persipic": "percipic"
}

updates = defaultdict(int)
for nick, amt in raw_data:
    updates[nick] += amt

def main():
    db = SessionLocal()
    try:
        service = AdminExternalRankingService()
        
        # Target timestamp: 2026-01-16 16:50 KST
        kst = ZoneInfo("Asia/Seoul")
        target_now = datetime(2026, 1, 16, 16, 50, 0, tzinfo=kst)
        print(f"Target Time (KST): {target_now}")
        
        ranking_payloads = []
        
        for nickname, add_amount in updates.items():
            print(f"Processing {nickname}: +{add_amount:,}")
            
            # 1. Resolve User
            # We use the same logic as service to find user by nickname
            # Check nickname directly first for safety
            user = db.query(User).filter(User.nickname == nickname).first()
            if not user:
                print(f"!! User not found by nickname: {nickname}")
                # Try partial match or skip? Strict match required.
                continue
                
            print(f"  -> Found User ID: {user.id} ({user.nickname})")
            
            # 2. Get Current Ranking Data
            current_ranking = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user.id).first()
            current_amt = current_ranking.deposit_amount if current_ranking else 0
            
            new_total = current_amt + add_amount
            print(f"  -> Current: {current_amt:,} + New: {add_amount:,} = Total: {new_total:,}")
            
            # 3. Create Payload
            # We pass external_id as nickname so _resolve_user_id can find it (or pass user_id directly)
            # Service supports user_id in payload.
            payload = ExternalRankingCreate(
                user_id=user.id,
                deposit_amount=new_total,
                play_count=current_ranking.play_count if current_ranking else 0,
                memo=f"Manual Deposit 2026-01-16 ({add_amount:,})"
            )
            ranking_payloads.append(payload)
            
        if not ranking_payloads:
            print("No payloads created.")
            return

        print(f"Upserting {len(ranking_payloads)} records...")
        results = service.upsert_many(db, ranking_payloads, now=target_now)
        
        print("Done.")
        for res in results:
            print(f"  User {res.user_id}: Updated to {res.deposit_amount:,}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
