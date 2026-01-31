#!/usr/bin/env python3
"""복권/퍼즐/리워드 로그 확인 스크립트"""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("=== v2_lottery_prize 전체 (퍼즐 관련) ===")
try:
    result = db.execute(text("SELECT * FROM v2_lottery_prize WHERE reward_type LIKE '%PUZZLE%'")).fetchall()
    for r in result:
        print(dict(r._mapping))
except Exception as e:
    print(f"Error: {e}")

print("\n=== v2_lottery_prize 전체 ===")
try:
    result = db.execute(text("SELECT id, config_id, label, reward_type, reward_amount, weight, stock, is_active FROM v2_lottery_prize")).fetchall()
    for r in result:
        print(dict(r._mapping))
except Exception as e:
    print(f"Error: {e}")

print("\n=== v2_lottery_log 전체 (상세) ===")
try:
    result = db.execute(text("SELECT * FROM v2_lottery_log ORDER BY id DESC")).fetchall()
    for r in result:
        print(dict(r._mapping))
except Exception as e:
    print(f"Error: {e}")

print("\n=== user_game_wallet (user_id=1, Jimin) ===")
try:
    result = db.execute(text("SELECT * FROM user_game_wallet WHERE user_id=1")).fetchall()
    for r in result:
        print(dict(r._mapping))
except Exception as e:
    print(f"Error: {e}")

print("\n=== user_game_wallet_ledger (user_id=1, 최근 20건) ===")
try:
    result = db.execute(text("SELECT * FROM user_game_wallet_ledger WHERE user_id=1 ORDER BY id DESC LIMIT 20")).fetchall()
    for r in result:
        print(dict(r._mapping))
except Exception as e:
    print(f"Error: {e}")

db.close()
