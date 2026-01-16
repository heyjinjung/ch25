import sys
import os
import json
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.models.user import User

def main():
    db = SessionLocal()
    users = db.query(User).all()
    out = []
    for u in users:
        out.append({
            "id": u.id,
            "nickname": u.nickname,
            "telegram_username": u.telegram_username,
            "external_id": u.external_id
        })
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
