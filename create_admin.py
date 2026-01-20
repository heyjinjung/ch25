import hashlib
from app.db.session import SessionLocal
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.external_id == "admin").first()
        if admin:
            print("Admin user already exists. Updating password.")
        else:
            admin = User(external_id="admin", nickname="Administrator")
            db.add(admin)
            db.flush() # Get ID
        
        # Set password
        password = "2026"
        admin.password_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        
        # Ensure AdminUserProfile exists
        profile = db.query(AdminUserProfile).filter(AdminUserProfile.user_id == admin.id).first()
        if not profile:
            profile = AdminUserProfile(user_id=admin.id, external_id="admin", tags=["ROLE_ADMIN"])
            db.add(profile)
        else:
            if not profile.tags:
                profile.tags = ["ROLE_ADMIN"]
            elif "ROLE_ADMIN" not in profile.tags:
                profile.tags.append("ROLE_ADMIN")
        
        db.commit()
        print(f"Successfully created/updated admin user: admin / {password}")
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
