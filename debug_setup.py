
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

try:
    print("1. Importing conftest deps...")
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.base_class import Base
    import app.db.base
    
    print("2. Creating Engine...")
    engine = create_engine("sqlite:///:memory:")
    
    print("3. Creating Tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    print("4. Inspection...")
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables:", tables)
    
    if "v2_user_deposit_evidence" in tables:
        print("SUCCESS: v2_user_deposit_evidence exists.")
    else:
        print("FAILURE: v2_user_deposit_evidence MISSING.")
        
except Exception as e:
    print(f"CRASH: {e}")
    import traceback
    traceback.print_exc()
