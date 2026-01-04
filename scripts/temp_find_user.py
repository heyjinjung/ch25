import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

query = sys.argv[1] if len(sys.argv) > 1 else "7711588195"

with engine.connect() as conn:
    sql = text("SELECT id, external_id, nickname, vault_locked_balance FROM user WHERE external_id LIKE :q OR nickname LIKE :q")
    results = conn.execute(sql, {"q": f"%{query}%"}).fetchall()
    for r in results:
        print(f"ID: {r[0]}, ExternalID: {r[1]}, Nickname: {r[2]}, Balance: {r[3]}")
