
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def list_tables():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        result = conn.execute(text("SHOW TABLES"))
        print("Tables in database:")
        for row in result:
            print(f"- {row[0]}")

if __name__ == "__main__":
    list_tables()
