import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

user_query = sys.argv[1] if len(sys.argv) > 1 else "7711588195"

with engine.connect() as conn:
    # Find user
    user = conn.execute(text("SELECT id, external_id FROM user WHERE external_id LIKE :q"), {"q": f"%{user_query}%"}).fetchone()
    if not user:
        print(f"User {user_query} not found")
        sys.exit(1)
    
    uid = user[0]
    print(f"Found User ID: {uid}, ExtID: {user[1]}")

    # Find mission progress
    sql = text("""
        SELECT m.id, m.title, m.reward_type, m.reward_amount, p.current_value, p.is_completed, p.is_claimed, m.logic_key
        FROM mission m
        LEFT JOIN user_mission_progress p ON m.id = p.mission_id AND p.user_id = :uid
        WHERE m.is_active = 1
    """)
    results = conn.execute(sql, {"uid": uid}).fetchall()
    
    print("\n--- Mission Progress ---")
    for r in results:
        status = "CLAIMED" if r[6] else ("COMPLETED" if r[5] else "IN_PROGRESS")
        print(f"ID: {r[0]} | Title: {r[1]} | Reward: {r[3]} {r[2]} | Progress: {r[4]} | Status: {status} | Key: {r[7]}")
