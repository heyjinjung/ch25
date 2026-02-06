from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# .env 로드
load_dotenv()

# DATABASE_URL 가져오기
db_url = os.getenv("DATABASE_URL")

# Windows 로컬 환경에서 도커 호스트 'db'를 'localhost'로 변경 시도 (필요한 경우)
if "db:3306" in db_url:
    db_url = db_url.replace("db:3306", "localhost:3306")

print(f"Connecting to: {db_url}")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # 컬럼 존재 여부 확인
        check_sql = text("SHOW COLUMNS FROM v2_user LIKE 'benefits_suspended_manual'")
        result = conn.execute(check_sql).fetchone()
        
        if not result:
            print("Column 'benefits_suspended_manual' missing. Adding now...")
            add_col_sql = text("ALTER TABLE v2_user ADD COLUMN benefits_suspended_manual INT NOT NULL DEFAULT 0 AFTER role")
            conn.execute(add_col_sql)
            conn.commit()
            print("Successfully added column 'benefits_suspended_manual'.")
        else:
            print("Column 'benefits_suspended_manual' already exists.")
            
except Exception as e:
    print(f"Error occurred: {e}")
