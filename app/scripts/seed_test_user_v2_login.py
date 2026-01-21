"""Seed dev-only test user for V2 login.

Creates or updates:
- external_id: test
- password: 1234

Safe to run multiple times.

Usage (docker):
  docker compose exec backend python app/scripts/seed_test_user_v2_login.py
"""

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.external_id == "test").one_or_none()
        if user is None:
            user = User(
                external_id="test",
                nickname="test",
                level=1,
            )
            db.add(user)
            db.flush()

        user.nickname = "test"
        user.password_hash = hash_password("1234")

        db.commit()
        db.refresh(user)
        print(f"OK: seeded test user id={user.id} external_id={user.external_id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
