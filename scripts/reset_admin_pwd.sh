#!/bin/bash
# Reset admin password
cd /opt/ch25
docker compose exec -T backend python3 << 'EOF'
from app.core.security import hash_password
from app.api.deps import get_db
from app.v2.models.user import V2User
from sqlalchemy.orm import Session

# Get DB session
from app.core.db import SessionLocal
db = SessionLocal()

try:
    admin = db.query(V2User).filter(V2User.cc_id == "admin").first()
    if admin:
        new_password = "xmas2026admin!"
        admin.password_hash = hash_password(new_password)
        db.commit()
        print(f"✅ admin 비밀번호 재설정 완료: {new_password}")
        print(f"   user_id: {admin.id}")
        print(f"   role: {admin.role}")
    else:
        print("❌ admin 계정을 찾을 수 없습니다")
finally:
    db.close()
EOF
