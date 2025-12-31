import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.roulette_service import RouletteService

def seed_default_roulette():
    db = SessionLocal()
    service = RouletteService()
    try:
        print("Seeding default segments for Config ID 1...")
        segments = service._seed_default_segments(db, config_id=1)
        print(f"Seeded {len(segments)} segments.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_default_roulette()
