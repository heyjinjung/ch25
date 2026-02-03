"""user_level_progress 테이블 확인 및 초기화"""
import sys
sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

user_ids = [8, 10]  # 참새참새, 민똘이

print("=== user_level_progress 현재 상태 ===")
for uid in user_ids:
    result = db.execute(text(f"SELECT * FROM user_level_progress WHERE user_id = {uid}")).fetchall()
    for r in result:
        print(f"user_id={r[0]}, level={r[1]}, xp={r[2]}, updated_at={r[3]}")

print("\n=== 초기화 실행 ===")
for uid in user_ids:
    db.execute(text(f"UPDATE user_level_progress SET level = 0, xp = 0 WHERE user_id = {uid}"))
    print(f"user_id={uid} -> level=0, xp=0")

db.commit()
print("\n✅ 초기화 완료!")

print("\n=== 초기화 후 상태 ===")
for uid in user_ids:
    result = db.execute(text(f"SELECT * FROM user_level_progress WHERE user_id = {uid}")).fetchall()
    for r in result:
        print(f"user_id={r[0]}, level={r[1]}, xp={r[2]}")

db.close()
