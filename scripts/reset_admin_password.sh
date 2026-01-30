#!/bin/bash
cd /opt/ch25

# 기존 프로젝트의 hash_password 함수 사용
docker compose exec -T backend python -c "
from app.core.security import hash_password
from sqlalchemy import create_engine, text
import os

new_password = '20260130'
hashed = hash_password(new_password)

engine = create_engine(os.getenv('DATABASE_URL', 'mysql+pymysql://xmasuser:2026@db:3306/xmas_event'))
with engine.connect() as conn:
    conn.execute(text('UPDATE v2_user SET password_hash = :hash WHERE cc_id = :cc_id'), {'hash': hashed, 'cc_id': 'admin'})
    conn.commit()
    print(f'admin 비밀번호가 20260130으로 변경되었습니다.')
    print(f'Hash: {hashed[:30]}...')
"

echo ""
echo "=== 로그인 테스트 ==="
curl -s -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"cc_id":"admin","password":"20260130"}'
