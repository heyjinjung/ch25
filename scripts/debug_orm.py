
import sys
import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings
from app.models.user import User
from app.models.vault_ledger import VaultLedger

def debug_orm():
    print(f"User Table: {User.__tablename__}")
    print(f"VaultLedger Table: {VaultLedger.__tablename__}")
    
    # Inspect relationships
    insp = inspect(User)
    print("User Relationships:", list(insp.relationships.keys()))
    
    insp_vl = inspect(VaultLedger)
    print("VaultLedger Relationships:", list(insp_vl.relationships.keys()))
    
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("Querying User...")
        u = db.query(User).first()
        print("User found:", u.id if u else "None")
        
        print("Querying VaultLedger...")
        vl = db.query(VaultLedger).first()
        print("VaultLedger found:", vl.id if vl else "None")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_orm()
