import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.external_id == "admin").first()
        if not admin:
            admin = User(
                external_id="admin",
                nickname="Administrator",
                status="ADMIN",
                password_hash=hash_password("admin1234"),
                level=99,
                xp=0
            )
            db.add(admin)
            db.commit()
            print("Successfully created admin user.")
            print("ID: admin")
            print("PW: admin1234")
        else:
            print("Admin user 'admin' already exists.")
            # Ensure status is ADMIN anyway
            if admin.status != "ADMIN":
                admin.status = "ADMIN"
                db.commit()
                print("Updated existing 'admin' user status to ADMIN.")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
