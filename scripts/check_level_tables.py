"""레벨 관련 테이블 확인 및 완전 초기화"""
import sys
sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# 1. 레벨 관련 테이블 찾기
print("=== 레벨 관련 테이블 ===")
tables = db.execute(text("SHOW TABLES")).fetchall()
level_tables = [t[0] for t in tables if "level" in t[0].lower()]
print(level_tables)

# 2. v2_user_level 테이블 존재하면 확인
for table in level_tables:
    print(f"\n=== {table} 구조 ===")
    cols = db.execute(text(f"DESCRIBE {table}")).fetchall()
    for c in cols:
        print(f"  {c[0]}: {c[1]}")

# 3. 민똘이, 참새참새 관련 레벨 데이터 확인
print("\n=== 유저별 레벨 데이터 확인 ===")

# V2User에서 user_id 확인
from app.v2.models.user import V2User
users = db.query(V2User).filter(V2User.nickname.in_(["민똘이", "참새참새"])).all()
user_ids = [u.id for u in users]
print(f"User IDs: {user_ids}")

for u in users:
    print(f"\n{u.nickname} (ID={u.id}): V2User.level = {u.level}")

# v2_user_level 테이블 체크
if "v2_user_level" in level_tables:
    for uid in user_ids:
        result = db.execute(text(f"SELECT * FROM v2_user_level WHERE user_id = {uid}")).fetchall()
        print(f"  v2_user_level for user {uid}: {result}")

# level_xp_progress 테이블 체크
if "level_xp_progress" in level_tables:
    for uid in user_ids:
        result = db.execute(text(f"SELECT * FROM level_xp_progress WHERE user_id = {uid}")).fetchall()
        print(f"  level_xp_progress for user {uid}: {result}")

db.close()
