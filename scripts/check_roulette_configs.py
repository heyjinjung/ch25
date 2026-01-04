
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.roulette import RouletteConfig, RouletteSegment

settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

configs = db.query(RouletteConfig).all()
print(f"Total configs: {len(configs)}")

for c in configs:
    print(f"\n[ID: {c.id}] Name: {c.name}, Type: {c.ticket_type}, Active: {c.is_active}")
    for s in c.segments:
        print(f"  - Slot {s.slot_index}: {s.label} | Reward: {s.reward_type} ({s.reward_amount}) | Weight: {s.weight}")

db.close()
