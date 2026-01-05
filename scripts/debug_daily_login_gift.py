"""Debug script: verify Daily Login Gift payout end-to-end via codebase.

Usage (inside backend container):
  python3 scripts/debug_daily_login_gift.py

What it does:
- Creates a temporary user (no Telegram needed)
- Finds mission logic_key='daily_login_gift' (or prints guidance if missing)
- Simulates the backend's "Lazy Daily Check" (increments LOGIN if last_login_at is stale)
- Claims the mission reward via MissionService.claim_reward
- Verifies DIAMOND inventory increased

Notes:
- By default, the user is deleted at the end (CASCADE should clean related rows).
  If you want to keep the user for inspection, pass: --keep
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import argparse
import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure app imports work when run from repo root
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.inventory import UserInventoryItem
from app.models.mission import Mission
from app.models.user import User
from app.services.mission_service import MissionService


@dataclass
class Result:
    ok: bool
    message: str


def _diamond_qty(db, user_id: int) -> int:
    row = (
        db.query(UserInventoryItem)
        .filter(UserInventoryItem.user_id == user_id, UserInventoryItem.item_type == "DIAMOND")
        .one_or_none()
    )
    return int(row.quantity) if row is not None else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep", action="store_true", help="Keep the created user (no cleanup)")
    args = parser.parse_args()

    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    u: User | None = None

    try:
        print("\n--- DEBUG: Daily Login Gift ---")

        # 1) Create test user
        ext = f"debug_daily_gift_{int(datetime.now(timezone.utc).timestamp())}"
        u = User(external_id=ext, nickname="DailyGiftDebug")
        # Make it definitely stale so the lazy check would run
        u.last_login_at = datetime.now(timezone.utc) - timedelta(days=2)
        db.add(u)
        db.commit()
        db.refresh(u)
        print(f"User created: id={u.id}, external_id={u.external_id}")

        # 2) Find seeded mission
        mission = db.query(Mission).filter(Mission.logic_key == "daily_login_gift").one_or_none()
        if mission is None:
            print("[ERROR] Mission 'daily_login_gift' not found in DB.")
            print("- Run seeding script (example): python3 scripts/seed_daily_gift_mission.py")
            return 2

        print(f"Mission found: id={mission.id}, title={mission.title}, reward={mission.reward_amount} {mission.reward_type}")

        # 3) Simulate the backend 'Lazy Daily Check' behavior: advance LOGIN mission
        ms = MissionService(db)
        ms.update_progress(user_id=u.id, action_type="LOGIN", delta=1)

        # 4) Claim
        before = _diamond_qty(db, u.id)
        ok, reward_type, amount = ms.claim_reward(u.id, mission.id)
        after = _diamond_qty(db, u.id)

        print(f"Claim result: ok={ok}, reward_type={reward_type}, amount={amount}")
        print(f"DIAMOND inventory: before={before} -> after={after} (delta={after - before})")

        if not ok:
            print("[FAIL] Claim did not succeed.")
            return 3

        if after <= before:
            print("[FAIL] Claim succeeded but DIAMOND inventory did not increase.")
            return 4

        print("[OK] Daily Login Gift payout verified.")
        return 0

    except Exception as e:
        print("\n[!!! ERROR !!!]", e)
        import traceback

        traceback.print_exc()
        return 1

    finally:
        if u is not None and not args.keep:
            try:
                db.delete(u)
                db.commit()
                print("Cleanup: user deleted.")
            except Exception as e:
                db.rollback()
                print("Cleanup failed (user kept):", e)
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
