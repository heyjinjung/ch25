
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def inspect():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        for col in ['category', 'reward_type']:
            print(f"--- {col} ---")
            res = conn.execute(text(f"SHOW COLUMNS FROM mission LIKE '{col}'"))
            row = res.mappings().first()
            if row:
                print(row['Type'])
            else:
                print(f"Column '{col}' not found.")

if __name__ == "__main__":
    inspect()
