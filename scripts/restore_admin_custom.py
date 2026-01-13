
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def restore_admin_custom():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.external_id == "admin").first()
        target_password = "2wP?+!Etm8#Qv4Mn"
        
        if not admin:
            print("Admin user does not exist. Creating...")
            admin = User(
                external_id="admin",
                nickname="Administrator",
                status="ADMIN",
                password_hash=hash_password(target_password),
                level=99,
                xp=0
            )
            db.add(admin)
            print("Successfully created admin user.")
        else:
            print("Admin user found. Updating password...")
            admin.password_hash = hash_password(target_password)
            if admin.status != "ADMIN":
                admin.status = "ADMIN"
            
        db.commit()
        print(f"Admin password has been reset to: {target_password}")
            
    except Exception as e:
        print(f"Error restoring admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    restore_admin_custom()
