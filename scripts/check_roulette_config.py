from app.db.session import SessionLocal
from app.models.roulette import RouletteConfig
from sqlalchemy import select

db = SessionLocal()
configs = db.execute(select(RouletteConfig)).scalars().all()

print(f"Total configs: {len(configs)}")
for c in configs:
    print(f"ID: {c.id}, Name: {c.name}, Type: {c.ticket_type}, Active: {c.is_active}")
