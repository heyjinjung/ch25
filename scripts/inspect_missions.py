import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.mission import Mission
from sqlalchemy import select, or_

def inspect_missions():
    db = SessionLocal()
    try:
        # Search for missions related to "Code Wallet" or "26"
        missions = db.scalars(select(Mission).where(
            or_(
                Mission.title.like("%코드%"),
                Mission.description.like("%26%")
            )
        )).all()
        
        print(f"Found {len(missions)} missions:")
        for m in missions:
            print(f"ID: {m.id}")
            print(f"Title: {m.title}")
            print(f"Description: {m.description}")
            print(f"Logic Key: {m.logic_key}")
            print(f"Action Type: {m.action_type}")
            print(f"Target Value: {m.target_value}")
            print(f"Is Active: {m.is_active}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_missions()
