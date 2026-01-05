from app.db.session import SessionLocal
from app.models.mission import Mission
from sqlalchemy import or_

db = SessionLocal()
try:
    missions = db.query(Mission).all()
    print(f"Total Missions: {len(missions)}")
    print("-" * 60)
    print(f"{'ID':<4} | {'Title':<30} | {'LogicKey':<20} | {'Action':<15} | {'Category':<10} | {'Active'}")
    print("-" * 60)
    for m in missions:
        print(f"{m.id:<4} | {m.title[:30]:<30} | {str(m.logic_key)[:20]:<20} | {m.action_type:<15} | {m.category:<10} | {m.is_active}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
