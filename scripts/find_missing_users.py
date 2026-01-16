import sys
import os
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import or_

def main():
    db = SessionLocal()
    terms = ["효시리", "정우성", "persipic", "배성윤", "박관종", "최재훈"]
    print(f"Searching for: {terms}")
    
    users = db.query(User).filter(
        or_(
            User.nickname.in_(terms),
            User.external_id.in_(terms)
        )
    ).all()
    
    if not users:
        print("Direct match failed. Trying LIKE %...")
        for term in terms:
            matches = db.query(User).filter(User.nickname.like(f"%{term}%")).all()
            for u in matches:
                print(f"Match for {term}: ID={u.id}, Nick={u.nickname}, Ext={u.external_id}")
            
            matches2 = db.query(User).filter(User.external_id.like(f"%{term}%")).all()
            for u in matches2:
                print(f"Match Ext for {term}: ID={u.id}, Nick={u.nickname}, Ext={u.external_id}")

    else:
         for u in users:
            print(f"Found: ID={u.id}, Nick={u.nickname}, Ext={u.external_id}")

if __name__ == "__main__":
    main()
