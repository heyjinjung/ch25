import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
# Also try parent dir if backend is at root relative to script
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings
from app.models.roulette import RouletteConfig, RouletteSegment

def tune_roulette_rtp():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        print("Searching for ROULETTE_COIN configs...")
        configs = db.query(RouletteConfig).filter(RouletteConfig.ticket_type == "ROULETTE_COIN").all()
        
        if not configs:
            print("No ROULETTE_COIN configs found.")
            return

        for config in configs:
            print(f"Processing Config ID: {config.id}, Name: {config.name}")
            segments = db.query(RouletteSegment).filter(RouletteSegment.config_id == config.id).all()
            
            for seg in segments:
                print(f"  - Slot {seg.slot_index}: {seg.label} ({seg.reward_type}: {seg.reward_amount}) Weight: {seg.weight}")
                
                # 1. 꽝 (Fail) Weight 50% Reduction
                if seg.reward_amount == 0 and seg.reward_type == "NONE":
                    old_weight = seg.weight
                    new_weight = int(old_weight * 0.5)
                    seg.weight = new_weight
                    print(f"    -> REDUCED Weight (Fail): {old_weight} -> {new_weight}")
                
                # 2. 5000 Point Weight 2x Increase
                elif seg.reward_amount == 5000 and seg.reward_type == "POINT":
                    old_weight = seg.weight
                    new_weight = int(old_weight * 2)
                    seg.weight = new_weight
                    print(f"    -> INCREASED Weight (5000P): {old_weight} -> {new_weight}")
                

            
            print("  - Calculating Total Weight...")
            total_weight = sum(s.weight for s in segments)
            print(f"  - New Total Weight: {total_weight}")
            
        # Commit changes
        # db.commit()
        print("DRY RUN: Changes NOT committed. Uncomment db.commit() to apply.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    tune_roulette_rtp()
