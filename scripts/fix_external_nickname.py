#!/usr/bin/env python3
"""Fix external_nickname typo for user id=8."""
from app.db.session import SessionLocal
from app.v2.models.user import V2User

db = SessionLocal()
u = db.query(V2User).filter(V2User.id == 8).first()
print(f"Before: id={u.id}, nickname={u.nickname}, external_nickname={u.external_nickname}")
u.external_nickname = "참새참새"
db.commit()
db.refresh(u)
print(f"After: id={u.id}, nickname={u.nickname}, external_nickname={u.external_nickname}")
db.close()
