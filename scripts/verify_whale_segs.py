
import os
import sys
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.models.external_ranking import ExternalRankingData
from app.models.user_segment import UserSegment

db = SessionLocal()
try:
    # Find users with high deposit
    whales = db.query(ExternalRankingData).filter(ExternalRankingData.deposit_amount >= 5000000).all()
    print(f"Count of users with >= 5M deposit: {len(whales)}")
    for w in whales:
        seg = db.query(UserSegment).filter(UserSegment.user_id == w.user_id).first()
        segment_val = seg.segment if seg else "NONE"
        print(f"User {w.user_id}: Deposit={w.deposit_amount}, Segment={segment_val}")
finally:
    db.close()
