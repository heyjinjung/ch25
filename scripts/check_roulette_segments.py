import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.roulette import RouletteSegment, RouletteConfig
from sqlalchemy import select

def check_roulette_segments():
    db = SessionLocal()
    try:
        configs = db.scalars(select(RouletteConfig)).all()
        for c in configs:
            segments = db.scalars(select(RouletteSegment).where(RouletteSegment.config_id == c.id)).all()
            print(f"Config ID: {c.id}, Name: {c.name}, Ticket: {c.ticket_type}, Active: {c.is_active}")
            print(f"  Segment Count: {len(segments)}")
            total_weight = sum(s.weight for s in segments)
            print(f"  Total Weight: {total_weight}")
            if len(segments) == 0:
                 print("  [WARNING] No segments!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_roulette_segments()
