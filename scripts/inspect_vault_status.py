# -*- coding: utf-8 -*-
from app.db.session import SessionLocal
from app.v2.services.vault_service import V2VaultService

def check_vault_status(user_id=15):
    db = SessionLocal()
    try:
        print(f"=== Vault Status Check (User ID: {user_id}) ===")
        
        from sqlalchemy import text
        # 1. Check raw events
        events_count = db.execute(
            text("SELECT count(*) FROM vault_earn_event WHERE user_id = :uid AND earn_type = 'GAME_PLAY'"),
            {"uid": user_id}
        ).scalar()
        print(f"DB Total Game Play Count (All Time): {events_count}")
        
        # List last 5 events
        rows = db.execute(
            text("SELECT created_at, earn_type FROM vault_earn_event WHERE user_id = :uid ORDER BY created_at DESC LIMIT 5"),
            {"uid": user_id}
        ).fetchall()
        for r in rows:
            print(f"  - {r}")

        # 2. Check Service Logic
        service = V2VaultService()
        info = service.get_vault_info(db, user_id)
        
        print(f"Service daily_play_count: {info.get('daily_play_count')}")
        print(f"Service daily_play_target: {info.get('daily_play_target')}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_vault_status()
