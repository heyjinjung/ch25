"""Debug script: verify streak reward claim end-to-end (no Telegram required).

What this does:
- Creates a temporary user
- (Optionally) sets a deterministic `streak_reward_rules` UI config
- Simulates consecutive daily plays to build a streak
- Verifies `claimable_day` appears
- Claims the streak reward
- Prints wallet/inventory diffs and idempotency behavior

Run (inside backend container or local venv with DB access):
  python scripts/debug_streak_reward_claim.py --day 1
  python scripts/debug_streak_reward_claim.py --day 3
  python scripts/debug_streak_reward_claim.py --day 7

Notes:
- By default, this script overwrites `streak_reward_rules` temporarily and restores it.
- Use --keep to keep the user and the modified config.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from zoneinfo import ZoneInfo

from app.db.session import SessionLocal
from app.models.game_wallet import UserGameWallet
from app.models.inventory import UserInventoryItem
from app.models.user import User
from app.services.mission_service import MissionService
from app.services.ui_config_service import UiConfigService


@dataclass(frozen=True)
class Snapshots:
    wallets: dict[str, int]
    inventory: dict[str, int]


def _snapshot_user_state(db, user_id: int) -> Snapshots:
    wallets: dict[str, int] = {}
    for row in db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).all():
        wallets[str(row.token_type)] = int(row.balance or 0)

    inventory: dict[str, int] = {}
    for row in db.query(UserInventoryItem).filter(UserInventoryItem.user_id == user_id).all():
        inventory[str(row.item_type)] = int(row.quantity or 0)

    return Snapshots(wallets=wallets, inventory=inventory)


def _print_diff(before: Snapshots, after: Snapshots) -> None:
    def _delta_map(b: dict[str, int], a: dict[str, int]) -> dict[str, int]:
        keys = set(b.keys()) | set(a.keys())
        out: dict[str, int] = {}
        for k in sorted(keys):
            dv = int(a.get(k, 0)) - int(b.get(k, 0))
            if dv != 0:
                out[k] = dv
        return out

    w_delta = _delta_map(before.wallets, after.wallets)
    i_delta = _delta_map(before.inventory, after.inventory)

    print("\n[DIFF] Wallet deltas:")
    print(w_delta if w_delta else "(no changes)")

    print("\n[DIFF] Inventory deltas:")
    print(i_delta if i_delta else "(no changes)")


def _default_grants_for_day(day: int) -> list[dict[str, Any]]:
    # Keep this deterministic and small.
    if day == 1:
        return [
            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
        ]
    if day == 3:
        return [
            {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
            {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
        ]
    if day == 7:
        return [
            {"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1},
        ]

    # Fallback: still create something claimable.
    return [
        {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
    ]


def _set_temp_streak_rules(db, *, day: int, grants: list[dict[str, Any]]) -> dict[str, Any] | None:
    row = UiConfigService.get(db, "streak_reward_rules")
    original = row.value_json if (row and row.value_json is not None) else None

    payload = {
        "version": 1,
        "rules": [
            {
                "day": int(day),
                "enabled": True,
                "grants": grants,
            }
        ],
    }
    UiConfigService.upsert(db, "streak_reward_rules", payload, admin_id=0)
    return original


def _restore_streak_rules(db, original_value_json: dict[str, Any] | None) -> None:
    if original_value_json is None:
        # Restore to empty dict to avoid leaving a partially-set config behind.
        UiConfigService.upsert(db, "streak_reward_rules", {}, admin_id=0)
        return

    UiConfigService.upsert(db, "streak_reward_rules", original_value_json, admin_id=0)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", type=int, default=1, help="Target streak day to become claimable and claim")
    parser.add_argument(
        "--no-set-rule",
        action="store_true",
        help="Do not override streak_reward_rules; use existing config as-is",
    )
    parser.add_argument("--keep", action="store_true", help="Keep created user and config changes")

    args = parser.parse_args()
    target_day = int(args.day)
    if target_day <= 0:
        raise SystemExit("--day must be >= 1")

    tz = ZoneInfo("Asia/Seoul")

    db = SessionLocal()
    user: User | None = None
    original_rules: dict[str, Any] | None = None

    try:
        # 1) Create test user
        external_id = f"debug_streak_{uuid4().hex[:10]}"
        user = User(external_id=external_id, nickname="debug_streak")
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"[USER] created id={user.id} external_id={user.external_id}")

        # 2) Optionally set deterministic streak rules
        grants = _default_grants_for_day(target_day)
        if not args.no_set_rule:
            original_rules = _set_temp_streak_rules(db, day=target_day, grants=grants)
            print(f"[UI_CONFIG] set temporary streak_reward_rules for day={target_day}")
        else:
            print("[UI_CONFIG] using existing streak_reward_rules (no override)")

        # 3) Build consecutive streak days, ending today
        base_now = datetime.now(tz).replace(hour=12, minute=0, second=0, microsecond=0)
        start_now = base_now - timedelta(days=(target_day - 1))

        svc = MissionService(db)
        for i in range(target_day):
            now_tz = start_now + timedelta(days=i)
            svc.sync_play_streak(user_id=int(user.id), now_tz=now_tz)
            db.flush()

        db.commit()

        # 4) Verify claimable
        streak_info = svc.get_streak_info(user_id=int(user.id))
        print("\n[STREAK_INFO]", streak_info)

        # 5) Snapshot then claim
        before = _snapshot_user_state(db, int(user.id))
        claim_result = svc.claim_streak_reward(user_id=int(user.id))
        print("\n[CLAIM_RESULT]", claim_result)

        after = _snapshot_user_state(db, int(user.id))
        _print_diff(before, after)

        # 6) Idempotency check
        claim_again = svc.claim_streak_reward(user_id=int(user.id))
        print("\n[CLAIM_AGAIN]", claim_again)

        return 0

    finally:
        if args.keep:
            print("\n[KEEP] --keep specified; skipping cleanup")
            try:
                db.close()
            except Exception:
                pass
            return 0

        # Best-effort restore config
        try:
            if not args.no_set_rule:
                _restore_streak_rules(db, original_rules)
                print("\n[CLEANUP] restored streak_reward_rules")
        except Exception as e:
            print(f"\n[CLEANUP] failed to restore streak_reward_rules: {e}")

        # Delete created user
        try:
            if user is not None:
                user_id = int(user.id)
                db.query(User).filter(User.id == user_id).delete()
                db.commit()
                print("[CLEANUP] deleted test user")
        except Exception as e:
            print(f"[CLEANUP] failed to delete test user: {e}")
        finally:
            try:
                db.close()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
