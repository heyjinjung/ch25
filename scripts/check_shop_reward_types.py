#!/usr/bin/env python
"""
상점 아이템 reward_type과 V2 표준 비교 스크립트
"""
from app.db.session import SessionLocal
from app.services.ui_config_service import UiConfigService
from app.models.game_wallet import GameTokenType
import json

# V2 표준 토큰 타입 (SoT)
V2_STANDARD_TYPES = {e.value for e in GameTokenType}

db = SessionLocal()
try:
    config_row = UiConfigService.get(db, "v2_shop_products")
    products = config_row.value_json if config_row else {}
    
    print("=== V2 표준 토큰 타입 ===")
    for t in sorted(V2_STANDARD_TYPES):
        print(f"  - {t}")
    
    print("\n=== 상점 아이템 검사 ===")
    issues = []
    for p in products.get("products", []):
        sku = p.get("sku", "?")
        reward_type = p.get("reward_type", "?")
        name = p.get("name", "?")
        
        is_valid = reward_type in V2_STANDARD_TYPES
        status = "✅" if is_valid else "❌ NOT IN V2 STANDARD"
        print(f"{status} SKU: {sku:<25} reward_type: {reward_type:<20} name: {name}")
        
        if not is_valid:
            issues.append((sku, reward_type, name))
    
    if issues:
        print(f"\n⚠️  총 {len(issues)}개 아이템이 V2 표준에 없는 reward_type 사용 중!")
        print("수정 필요 목록:")
        for sku, rt, name in issues:
            print(f"  - {name} ({sku}): '{rt}'")
    else:
        print("\n✅ 모든 아이템이 V2 표준 준수")
finally:
    db.close()
