
import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.v2.models import Mission

def list_missions():
    db = SessionLocal()
    try:
        missions = db.query(Mission).order_by(Mission.category, Mission.id).all()
        print(f"{'ID':<5} {'Category':<15} {'LogicKey':<30} {'Reward':<20} {'Title'}")
        print("-" * 100)
        for m in missions:
            reward = f"{m.reward_amount} {m.reward_type}"
            print(f"{m.id:<5} {str(m.category):<15} {m.logic_key:<30} {reward:<20} {m.title}")
    finally:
        db.close()

if __name__ == "__main__":
    list_missions()
