#!/bin/bash
cd /opt/ch25

docker compose exec -T backend python -c "
from app.core.security import hash_password, verify_password

# 테스트
password = '20260130'
hashed = hash_password(password)
print(f'Generated hash: {hashed}')
print(f'Verify result: {verify_password(password, hashed)}')

# DB에서 현재 해시 가져와서 확인
from sqlalchemy import create_engine, text
import os
engine = create_engine(os.getenv('DATABASE_URL', 'mysql+pymysql://xmasuser:2026@db:3306/xmas_event'))
with engine.connect() as conn:
    result = conn.execute(text('SELECT password_hash FROM v2_user WHERE cc_id = :cc_id'), {'cc_id': 'admin'})
    row = result.fetchone()
    if row and row[0]:
        db_hash = row[0]
        print(f'DB hash: {db_hash}')
        print(f'Verify DB hash: {verify_password(password, db_hash)}')
"
