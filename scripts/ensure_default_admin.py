import os
import sys

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin_user_profile import AdminUserProfile
from app.models.user import User


def ensure_default_admin(external_id: str = "admin", password: str = "2026") -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.external_id == external_id).first()
        if not user:
            user = User(
                external_id=external_id,
                nickname="Administrator",
                password_hash=hash_password(password),
                level=99,
                xp=0,
                status="ACTIVE",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created admin user: external_id={external_id}")
        else:
            user.password_hash = hash_password(password)
            if not user.nickname:
                user.nickname = "Administrator"
            db.commit()
            print(f"Updated admin password: external_id={external_id}")

        profile = db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user.id).first()
        if not profile:
            profile = AdminUserProfile(user_id=user.id, external_id=user.external_id, tags=["ROLE_ADMIN"])
            db.add(profile)
            db.commit()
            print("Created AdminUserProfile with ROLE_ADMIN")
        else:
            tags = list(profile.tags or []) if isinstance(profile.tags, list) else []
            if "ROLE_ADMIN" not in [str(t).upper() for t in tags]:
                tags.append("ROLE_ADMIN")
            profile.tags = tags
            profile.external_id = user.external_id
            db.commit()
            print("Ensured AdminUserProfile.tags contains ROLE_ADMIN")

        print("OK")
        print(f"ID: {external_id}")
        print(f"PW: {password}")
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    external_id = (os.getenv("ADMIN_EXTERNAL_ID") or "admin").strip() or "admin"
    password = (os.getenv("ADMIN_PASSWORD") or "2026").strip() or "2026"
    ensure_default_admin(external_id=external_id, password=password)
