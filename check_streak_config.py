#!/usr/bin/env python3
"""스트릭 설정 확인 스크립트"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.v2.services.ui_config_service import UiConfigService
import json

if __name__ == "__main__":
    db = SessionLocal()
    try:
        row = UiConfigService.get(db, "streak_reward_rules")
        if row and row.value_json:
            print("=== Streak Reward Rules (from app_ui_config) ===")
            print(json.dumps(row.value_json, indent=2, ensure_ascii=False))
        else:
            print("=== Default Streak Reward Rules (no config in DB) ===")
            defaults = [
                {
                    "day": 3, "enabled": True, "grants": [
                        {"kind": "WALLET", "token_type": "ROULETTE_TICKET", "amount": 1},
                        {"kind": "WALLET", "token_type": "DICE_TICKET", "amount": 1},
                        {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
                    ]
                },
                {
                    "day": 7, "enabled": True, "grants": [
                        {"kind": "WALLET", "token_type": "DIAMOND", "amount": 1}
                    ]
                }
            ]
            print(json.dumps({"rules": defaults}, indent=2, ensure_ascii=False))
    finally:
        db.close()
