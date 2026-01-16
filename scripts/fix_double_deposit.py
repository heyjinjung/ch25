import sys
import os
from datetime import datetime
from zoneinfo import ZoneInfo
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.schemas.external_ranking import ExternalRankingCreate

# Users who were double-processed
double_processed = [
    ("신이다요", 40000),
    ("돈따묵쟈", 150000),
    ("기프트", 200000),
    ("아사카", 200000),
    ("봄꽃잎", 400000),
    ("민똘이", 300000)
]

def main():
    db = SessionLocal()
    service = AdminExternalRankingService()
    kst = ZoneInfo("Asia/Seoul")
    target_now = datetime(2026, 1, 16, 17, 0, 0, tzinfo=kst) # Just a timestamp

    payloads = []
    print("Fixing double counted deposits...")
    for nick, amt in double_processed:
        user = db.query(User).filter(User.nickname == nick).first()
        if not user:
            print(f"User {nick} not found during fix!")
            continue
            
        ranking = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user.id).first()
        if not ranking:
            continue
            
        current_amt = ranking.deposit_amount
        corrected_amt = current_amt - amt
        
        print(f"User {nick}: {current_amt:,} -> {corrected_amt:,} (Subtracting {amt:,})")
        
        payloads.append(ExternalRankingCreate(
            user_id=user.id,
            deposit_amount=corrected_amt,
            play_count=ranking.play_count,
            memo="Fix double counting 2026-01-16"
        ))
        
    if payloads:
        service.upsert_many(db, payloads, now=target_now)
        print("Fix applied.")
    else:
        print("No fix needed.")
        
if __name__ == "__main__":
    main()
