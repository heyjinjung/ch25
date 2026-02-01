#!/usr/bin/env python3
"""Check vault ledger data."""
import sys
sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Check table schema
    print("=== vault_ledger schema ===")
    schema = db.execute(text("DESCRIBE vault_ledger")).fetchall()
    for col in schema:
        print(f"  {col}")
    
    # Count total records
    count = db.execute(text("SELECT COUNT(*) FROM vault_ledger")).scalar()
    print(f"\nvault_ledger total rows: {count}")
    
    # Get all records
    print("\n=== All vault_ledger records ===")
    rows = db.execute(text("SELECT * FROM vault_ledger ORDER BY created_at DESC LIMIT 15")).fetchall()
    for r in rows:
        print(f"  {r}")
    
    # Check vault_status
    print("\n=== vault_status schema ===")
    status_schema = db.execute(text("DESCRIBE vault_status")).fetchall()
    for col in status_schema:
        print(f"  {col}")
        
finally:
    db.close()
