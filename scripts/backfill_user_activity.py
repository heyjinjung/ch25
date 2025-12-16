"""Backfill user_activity from existing historical tables.

What we can backfill safely:
- roulette_plays / last_play_at: from roulette_log
- dice_plays / last_play_at: from dice_log
- lottery_plays / last_play_at: from lottery_log
- last_login_at (mirror): from user.last_login_at
- last_charge_at: best-effort from external_ranking_data.updated_at when deposit_amount > 0

What we cannot backfill without additional event logs:
- total_play_duration
- last_bonus_used_at

Usage:
  python scripts/backfill_user_activity.py --dry-run
  python scripts/backfill_user_activity.py --apply
  python scripts/backfill_user_activity.py --apply --run-segmentation
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime

# Add project root to path (so `import app...` works when running as a script)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.dice import DiceLog
from app.models.external_ranking import ExternalRankingData
from app.models.lottery import LotteryLog
from app.models.roulette import RouletteLog
from app.models.user import User
from app.models.user_activity import UserActivity


@dataclass(frozen=True)
class LogStats:
    count: int
    last_at: datetime | None


def _load_log_stats(db: Session, model) -> dict[int, LogStats]:
    rows = db.execute(
        select(
            model.user_id,
            func.count(model.id),
            func.max(model.created_at),
        ).group_by(model.user_id)
    ).all()

    out: dict[int, LogStats] = {}
    for user_id, cnt, last_at in rows:
        out[int(user_id)] = LogStats(count=int(cnt or 0), last_at=last_at)
    return out


def _max_dt(*items: datetime | None) -> datetime | None:
    present = [dt for dt in items if dt is not None]
    return max(present) if present else None


def backfill(db: Session, *, apply: bool) -> dict[str, int]:
    now = datetime.utcnow()

    roulette = _load_log_stats(db, RouletteLog)
    dice = _load_log_stats(db, DiceLog)
    lottery = _load_log_stats(db, LotteryLog)

    ranking_by_user = {
        r.user_id: r for r in db.execute(select(ExternalRankingData)).scalars().all()
    }
    activity_by_user = {
        a.user_id: a for a in db.execute(select(UserActivity)).scalars().all()
    }

    users = db.execute(select(User.id, User.last_login_at)).all()

    created = 0
    updated = 0
    unchanged = 0

    for user_id, user_last_login_at in users:
        user_id = int(user_id)
        existing = activity_by_user.get(user_id)

        r = roulette.get(user_id, LogStats(0, None))
        d = dice.get(user_id, LogStats(0, None))
        l = lottery.get(user_id, LogStats(0, None))

        computed_last_play_at = _max_dt(r.last_at, d.last_at, l.last_at)

        ranking = ranking_by_user.get(user_id)
        computed_last_charge_at = None
        if ranking is not None and int(getattr(ranking, "deposit_amount", 0) or 0) > 0:
            computed_last_charge_at = getattr(ranking, "updated_at", None)

        if existing is None:
            row = UserActivity(user_id=user_id)
            created += 1
            existing = row
            activity_by_user[user_id] = row
        else:
            row = existing

        before = (
            row.last_login_at,
            row.last_charge_at,
            getattr(row, "last_play_at", None),
            row.roulette_plays,
            row.dice_plays,
            row.lottery_plays,
        )

        # Mirror last_login_at (only move forward)
        if user_last_login_at is not None:
            if row.last_login_at is None or user_last_login_at > row.last_login_at:
                row.last_login_at = user_last_login_at

        # Best-effort last_charge_at (only move forward)
        if computed_last_charge_at is not None:
            if row.last_charge_at is None or computed_last_charge_at > row.last_charge_at:
                row.last_charge_at = computed_last_charge_at

        # last_play_at (only move forward)
        if computed_last_play_at is not None:
            if row.last_play_at is None or computed_last_play_at > row.last_play_at:
                row.last_play_at = computed_last_play_at

        # Counts: never decrease
        row.roulette_plays = max(int(row.roulette_plays or 0), r.count)
        row.dice_plays = max(int(row.dice_plays or 0), d.count)
        row.lottery_plays = max(int(row.lottery_plays or 0), l.count)

        after = (
            row.last_login_at,
            row.last_charge_at,
            getattr(row, "last_play_at", None),
            row.roulette_plays,
            row.dice_plays,
            row.lottery_plays,
        )

        changed = before != after

        if apply:
            if changed or created:
                row.updated_at = now
                db.add(row)

        if changed:
            updated += 1
        else:
            unchanged += 1

    if apply:
        db.commit()

    return {
        "users": len(users),
        "created": created,
        "updated": updated,
        "unchanged": unchanged,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill user_activity from historical logs")
    parser.add_argument("--dry-run", action="store_true", help="Do not write DB changes")
    parser.add_argument("--apply", action="store_true", help="Write DB changes")
    parser.add_argument(
        "--run-segmentation",
        action="store_true",
        help="After apply, run scripts/segment_users.py to refresh user_segment",
    )
    args = parser.parse_args()

    if args.dry_run and args.apply:
        raise SystemExit("Choose one: --dry-run or --apply")
    apply = bool(args.apply) and not bool(args.dry_run)

    db = SessionLocal()
    try:
        stats = backfill(db, apply=apply)
    finally:
        db.close()

    mode = "APPLY" if apply else "DRY_RUN"
    print(f"[{mode}] backfill_user_activity users={stats['users']} created={stats['created']} updated={stats['updated']} unchanged={stats['unchanged']}")

    if args.run_segmentation:
        if not apply:
            raise SystemExit("--run-segmentation requires --apply")
        subprocess.check_call([sys.executable, "scripts/segment_users.py"])


if __name__ == "__main__":
    main()
