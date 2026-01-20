from app.db.session import SessionLocal
from app.v2.models.v2_dice import V2DiceConfig

db = SessionLocal()
try:
    config = db.query(V2DiceConfig).first()
    if config:
        print(f"FOUND: ID={config.id}, Name={config.name}")
    else:
        print("NOT FOUND")
finally:
    db.close()
