
import os
import sys
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.models.roulette import RouletteConfig, RouletteSegment

db = SessionLocal()
try:
    configs = db.query(RouletteConfig).filter(RouletteConfig.ticket_type == 'ROULETTE_COIN').all()
    for config in configs:
        print(f"\n[Config #{config.id}] Name: {config.name}, Grade: {config.grade}")
        segments = db.query(RouletteSegment).filter(RouletteSegment.config_id == config.id).order_by(RouletteSegment.slot_index).all()
        total_weight = sum(s.weight for s in segments)
        for s in segments:
            pct = (s.weight / total_weight * 100) if total_weight > 0 else 0
            print(f"  Slot {s.slot_index}: {s.label} ({s.reward_type}) - Amount: {s.reward_amount}, Weight: {s.weight} ({pct:.1f}%)")
finally:
    db.close()
