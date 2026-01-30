from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

db = SessionLocal()
admin = db.query(User).filter(User.external_id == 'admin').first()
if admin:
    admin.password_hash = hash_password('20260130')
    admin.status = 'ADMIN'
    db.commit()
    print('Admin password updated')
else:
    admin = User(
        external_id='admin',
        nickname='Administrator',
        status='ADMIN',
        password_hash=hash_password('20260130'),
        level=99,
        xp=0
    )
    db.add(admin)
    db.commit()
    print('Admin created')
db.close()
