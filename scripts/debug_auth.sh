#!/bin/bash
cd /opt/ch25

docker compose exec -T backend python -c "
import traceback
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys

# 모델 import
sys.path.insert(0, '/app')
from app.v2.models.user import V2User
from app.core.security import verify_password

engine = create_engine(os.getenv('DATABASE_URL', 'mysql+pymysql://xmasuser:2026@db:3306/xmas_event'))
Session = sessionmaker(bind=engine)
session = Session()

try:
    # admin 유저 조회
    user = session.query(V2User).filter(V2User.cc_id == 'admin').first()
    print(f'User found: {user is not None}')
    if user:
        print(f'  cc_id: {user.cc_id}')
        print(f'  role: {user.role}')
        print(f'  status: {user.status}')
        print(f'  password_hash exists: {user.password_hash is not None}')
        print(f'  password_hash length: {len(user.password_hash) if user.password_hash else 0}')
        
        # 비밀번호 검증
        password = '20260130'
        password_hash = getattr(user, 'password_hash', None)
        print(f'  getattr password_hash: {password_hash is not None}')
        
        if password_hash:
            result = verify_password(password, password_hash)
            print(f'  verify_password result: {result}')
        
        # 상태 체크
        from app.v2.models.user import UserStatus
        print(f'  status == ACTIVE: {user.status == UserStatus.ACTIVE}')
        print(f'  status value: {user.status.value if hasattr(user.status, \"value\") else user.status}')
except Exception as e:
    traceback.print_exc()
finally:
    session.close()
"
