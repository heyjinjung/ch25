from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    db.execute(text('ALTER TABLE v2_dice_config ADD COLUMN enable_golden_hour BOOLEAN NOT NULL DEFAULT TRUE'))
    db.execute(text('ALTER TABLE v2_dice_config ADD COLUMN golden_hour_multiplier FLOAT NOT NULL DEFAULT 2.0'))
    db.commit()
    print('✅ Golden Hour columns added successfully!')
except Exception as e:
    print(f'⚠️  Error: {e}')
    db.rollback()
finally:
    db.close()
