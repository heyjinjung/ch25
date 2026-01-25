#!/usr/bin/env python
"""골드키 reward_type 수정 스크립트"""
from app.db.session import SessionLocal
from app.services.ui_config_service import UiConfigService

db = SessionLocal()
try:
    config_row = UiConfigService.get(db, "v2_shop_products")
    products = config_row.value_json
    
    modified = False
    for p in products.get("products", []):
        if p.get("reward_type") == "GOLDEN_TICKET":
            print(f"수정 전: {p}")
            p["reward_type"] = "GOLD_KEY_TICKET"
            print(f"수정 후: {p}")
            modified = True
    
    if modified:
        UiConfigService.upsert(db, "v2_shop_products", products, admin_id=0)
        db.commit()
        print("✅ 완료!")
    else:
        print("변경 대상 없음")
finally:
    db.close()
