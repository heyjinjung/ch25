#!/usr/bin/env python
"""VaultProgram 테이블 확인"""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # VaultProgram 존재 여부 확인
    rows = db.execute(text("SELECT id, `key`, name, config_json FROM vault_program")).fetchall()
    print("=== VaultProgram 테이블 현황 ===")
    if not rows:
        print("❌ VaultProgram 레코드 없음!")
    for r in rows:
        print(f"ID: {r[0]}, key: {r[1]}, name: {r[2]}")
        print(f"  config_json: {r[3]}")
    
    # V2VaultService가 프로그램을 찾는지 확인
    print("\n=== get_config_value 테스트 ===")
    from app.v2.services.vault2_service import Vault2Service
    v2s = Vault2Service()
    gh_cfg = v2s.get_config_value(db, "golden_hour_config", {})
    print(f"golden_hour_config: {gh_cfg}")
finally:
    db.close()
