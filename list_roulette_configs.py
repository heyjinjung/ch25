import sys
import os

# Add project root to path
sys.path.append("c:/Users/JAVIS/ch/ch25")

from app.db.session import SessionLocal
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment

def list_roulette_configs():
    db = SessionLocal()
    try:
        print("--- Config ID 8 Full Details ---")
        config = db.query(V2RouletteConfig).filter_by(id=8).first()
        if not config:
            print("Config ID 8 not found!")
            return
            
        print(f"Name: '{config.name}'")
        print(f"Ticket Type: {config.ticket_type}")
        print(f"Active: {config.is_active}")
        print(f"Grade: {config.grade}")
        print()
        print("Segments:")
        segments = db.query(V2RouletteSegment).filter_by(config_id=8).order_by(V2RouletteSegment.slot_index).all()
        for seg in segments:
            print(f"  Slot {seg.slot_index}: {seg.label} | Reward: {seg.reward_type} {seg.reward_amount} | Weight: {seg.weight}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    list_roulette_configs()

