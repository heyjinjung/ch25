#!/usr/bin/env python
"""
Minimal test for /api/v2/admin/ops/status endpoint.
"""
import sys
sys.path.insert(0, "/app")

from sqlalchemy import text
from app.db.session import SessionLocal

def test_db():
    """Test DB connection"""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        print("✓ DB connection OK")
        return db
    except Exception as e:
        print(f"✗ DB Error: {e}")
        return None

def test_ops_status(db):
    """Test ops status function directly"""
    try:
        from app.v2.api.admin.ops_routes import get_ops_dashboard_status
        
        # Create mock admin info
        admin_info = (1, "ADMIN")
        
        # Call function directly
        result = get_ops_dashboard_status(db, admin_info)
        print(f"✓ Ops Status: {result}")
        return True
    except Exception as e:
        import traceback
        print(f"✗ Ops Status Error: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== Testing /api/v2/admin/ops/status ===\n")
    
    db = test_db()
    if db:
        test_ops_status(db)
        db.close()
