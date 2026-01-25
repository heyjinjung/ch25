
from app.db.session import SessionLocal
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment

def check_roulette_config():
    db = SessionLocal()
    try:
        configs = db.query(V2RouletteConfig).all()
        print(f"Total configs: {len(configs)}")
        for config in configs:
            print(f"Config ID: {config.id}, Name: {config.name}, Ticket Type: {config.ticket_type}, Active: {config.is_active}, Grade: {config.grade}")
            segments = db.query(V2RouletteSegment).filter(V2RouletteSegment.config_id == config.id).all()
            print(f"  Segments: {len(segments)}")
            for seg in segments:
                print(f"    Slot: {seg.slot_index}, Label: {seg.label}, Weight: {seg.weight}, Reward: {seg.reward_type} x {seg.reward_amount}")
    finally:
        db.close()

if __name__ == "__main__":
    check_roulette_config()
