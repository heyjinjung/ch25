#!/usr/bin/env python
"""서버 FK 제약조건 확인 스크립트."""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
result = db.execute(text("""
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA=DATABASE() 
AND REFERENCED_TABLE_NAME IS NOT NULL
""")).fetchall()

print(f'Total FKs: {len(result)}')
print('\n=== user/v2_user 참조 FK ===')
for r in result:
    if 'user' in r[2].lower():
        print(f'{r[0]}: {r[1]} -> {r[2]}')
