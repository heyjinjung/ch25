#!/bin/bash
cd /opt/ch25

docker compose exec -T backend python -c "
import traceback
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

sys.path.insert(0, '/app')
from app.v2.models.user import V2User
from app.models.feature import UserEventLog

engine = create_engine(os.getenv('DATABASE_URL', 'mysql+pymysql://xmasuser:2026@db:3306/xmas_event'))
Session = sessionmaker(bind=engine)
session = Session()

try:
    user = session.query(V2User).filter(V2User.cc_id == 'admin').first()
    print(f'User: {user}')
    print(f'User.id: {user.id}')
    print(f'User.cc_id: {user.cc_id}')
    
    # external_id 속성 체크
    print(f'hasattr external_id: {hasattr(user, \"external_id\")}')
    if hasattr(user, 'external_id'):
        print(f'User.external_id: {user.external_id}')
    else:
        print('external_id 속성 없음!')
    
    # UserEventLog 생성 시도
    print('\\nUserEventLog 생성 시도...')
    log = UserEventLog(
        user_id=user.id,
        feature_type='AUTH',
        event_name='AUTH_LOGIN',
        meta_json={'cc_id': user.cc_id, 'ip': 'test'}
    )
    session.add(log)
    session.commit()
    print('성공!')
except Exception as e:
    print(f'에러 발생: {type(e).__name__}: {e}')
    traceback.print_exc()
finally:
    session.close()
"
