"""One-time migration: cash_balance -> vault_locked_balance (Option B).

Goal (Vault Single-SoT rollout):
- Move all user.cash_balance into user.vault_locked_balance.
- Zero out user.cash_balance.
- Keep legacy mirror user.vault_balance aligned with new vault_locked_balance.

Usage:
  python scripts/migrate_cash_balance_to_vault_locked.py --dry-run
  python scripts/migrate_cash_balance_to_vault_locked.py --apply

Notes:
- This script does NOT write new user_cash_ledger rows.
- It intentionally does NOT touch vault_locked_expires_at to avoid changing expiry semantics
  for balances that were historically in cash.
"""

from __future__ import annotations

import argparse
import os
import sys

# Add project root to path (so `import app...` works when running as a script)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User


def _stats(db: Session) -> dict[str, int]:
    count_nonzero = (
        db.execute(
            select(func.count(User.id)).where(func.coalesce(User.cash_balance, 0) != 0)
        ).scalar_one()
        or 0
    )
    sum_cash = (
        db.execute(select(func.coalesce(func.sum(User.cash_balance), 0))).scalar_one()
        or 0
    )
    sum_locked = (
        db.execute(select(func.coalesce(func.sum(User.vault_locked_balance), 0))).scalar_one()
        or 0
    )
    return {
        "count_nonzero_cash": int(count_nonzero),
        "sum_cash": int(sum_cash),
        "sum_locked": int(sum_locked),
    }


def migrate(db: Session, *, apply: bool) -> dict[str, int]:
    before = _stats(db)

    if not apply:
        return {"applied": 0, **before}

    new_locked_expr = func.coalesce(User.vault_locked_balance, 0) + func.coalesce(User.cash_balance, 0)

    stmt = (
        update(User)
        .where(func.coalesce(User.cash_balance, 0) != 0)
        .values(
            vault_locked_balance=new_locked_expr,
            vault_balance=new_locked_expr,
            cash_balance=0,
        )
    )

    result = db.execute(stmt)
    db.commit()

    after = _stats(db)

    return {
        "applied": int(getattr(result, "rowcount", 0) or 0),
        **before,
        **{f"after_{k}": v for k, v in after.items()},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate user.cash_balance into user.vault_locked_balance (Option B)")
    mode = parser.add_mutually_exclusive_group(required=False)
    mode.add_argument("--dry-run", action="store_true", help="Print stats only (default)")
    mode.add_argument("--apply", action="store_true", help="Apply migration (writes to DB)")
    args = parser.parse_args()

    apply = bool(args.apply)

    db = SessionLocal()
    try:
        out = migrate(db, apply=apply)
    finally:
        db.close()

    if apply:
        print("[OK] Migration applied")
        print(f"- Rows affected: {out['applied']}")
        print(f"- Sum cash before: {out['sum_cash']}")
        print(f"- Sum locked before: {out['sum_locked']}")
        print(f"- Non-zero cash users before: {out['count_nonzero_cash']}")
        print(f"- Sum cash after: {out['after_sum_cash']}")
        print(f"- Sum locked after: {out['after_sum_locked']}")
        print(f"- Non-zero cash users after: {out['after_count_nonzero_cash']}")
        return

    print("[DRY-RUN] No changes written")
    print(f"- Non-zero cash users: {out['count_nonzero_cash']}")
    print(f"- Sum cash: {out['sum_cash']}")
    print(f"- Sum locked: {out['sum_locked']}")


if __name__ == "__main__":
    main()
