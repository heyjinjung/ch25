import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.mission import Mission
from sqlalchemy import select

def list_all_missions():
    db = SessionLocal()
    try:
        missions = db.scalars(select(Mission)).all()
        print(f"Total Missions: {len(missions)}")
        for m in missions:
            print(f"ID: {m.id}, Title: {m.title}, Target: {m.target_value}, Active: {m.is_active}, Action: {m.action_type}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_all_missions()
