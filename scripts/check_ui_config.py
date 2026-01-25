#!/usr/bin/env python
"""UiConfig 테이블 전체 현황 확인"""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    rows = db.execute(text("SELECT id, `key`, updated_at FROM app_ui_config ORDER BY id")).fetchall()
    print("=== UiConfig 테이블 현황 ===")
    for r in rows:
        print(f"ID: {r[0]:<3} key: {r[1]:<40} updated: {r[2]}")
    print(f"\n총 {len(rows)}개 레코드")
    
    # v2_shop_products 상세 확인
    print("\n=== v2_shop_products 상세 ===")
    shop = db.execute(text("SELECT `key`, value_json FROM app_ui_config WHERE `key`='v2_shop_products'")).fetchone()
    if shop:
        print(f"존재함: {shop[1]}")
    else:
        print("❌ v2_shop_products가 없음!")
finally:
    db.close()
