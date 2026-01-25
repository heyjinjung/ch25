
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def list_tables_detailed():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        result = conn.execute(text("SHOW TABLES"))
        tables = [row[0] for row in result]
        print(f"Total tables: {len(tables)}")
        for t in sorted(tables):
            count_res = conn.execute(text(f"SELECT count(*) FROM `{t}`"))
            count = count_res.scalar()
            print(f"- {t}: {count} rows")

if __name__ == "__main__":
    list_tables_detailed()
