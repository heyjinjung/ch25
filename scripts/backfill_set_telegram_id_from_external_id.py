#!/usr/bin/env python3
"""Backfill script: set `user.telegram_id` from `user.external_id` pattern.

Goal
- For rows where `user.telegram_id` is NULL and `external_id` matches `tg_{id}_...`,
  backfill `user.telegram_id = {id}`.

Safety
- Default is dry-run (no writes).
- On collision (telegram_id already used by another user), the row is skipped and logged.

Usage
  python scripts/backfill_set_telegram_id_from_external_id.py --dry-run
  python scripts/backfill_set_telegram_id_from_external_id.py --apply

Options
  --limit N       Print at most N sample rows in dry-run (default: 50)
  --batch-size N  Commit batch size (default: 500)

Notes
- If an `admin_profile` exists and its `telegram_id` is empty, this script also fills it
  with the same numeric string for legacy consistency.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import csv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import joinedload

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings  # noqa: E402
from app.models.user import User  # noqa: E402


_TG_EXTERNAL_ID_RE = re.compile(r"^tg_(\d+)_", re.IGNORECASE)


def _parse_tg_id(external_id: str | None) -> int | None:
    s = str(external_id or "").strip()
    if not s:
        return None
    m = _TG_EXTERNAL_ID_RE.match(s)
    if not m:
        return None
    try:
        return int(m.group(1))
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", "-n", action="store_true", help="Do not write; print planned changes")
    parser.add_argument("--apply", action="store_true", help="Apply updates (writes to DB)")
    parser.add_argument("--limit", type=int, default=50, help="Dry-run sample print limit")
    parser.add_argument("--batch-size", type=int, default=500, help="Commit batch size")
    parser.add_argument(
        "--log-file",
        type=str,
        default=None,
        help="Optional CSV log file path (recommended for --apply to enable rollback)",
    )
    args = parser.parse_args()

    dry_run = args.dry_run or not args.apply

    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()
    try:
        q = (
            db.query(User)
            .options(joinedload(User.admin_profile))
            .filter(User.telegram_id == None)  # noqa: E711
            .order_by(User.id.asc())
        )

        candidates = []
        for u in q.yield_per(1000):
            tg_id = _parse_tg_id(u.external_id)
            if tg_id is None:
                continue
            candidates.append((u, tg_id))

        total = len(candidates)
        print(f"Found {total} users with telegram_id NULL and external_id tg_* pattern")

        if dry_run:
            for u, tg_id in candidates[: max(0, args.limit)]:
                print(f"DRY: Would set user.id={u.id} telegram_id={tg_id} (external_id='{u.external_id}')")
            if total > args.limit:
                print("... (truncated)")
            print("Dry-run complete (no DB writes). Use --apply to write.")
            return 0

        log_fp = None
        log_writer = None
        if args.log_file:
            log_fp = open(args.log_file, "w", newline="", encoding="utf-8")
            log_writer = csv.writer(log_fp)
            log_writer.writerow(
                [
                    "user_id",
                    "external_id",
                    "old_user_telegram_id",
                    "new_user_telegram_id",
                    "old_profile_telegram_id",
                    "new_profile_telegram_id",
                ]
            )

        updated = 0
        skipped_collision = 0
        for idx, (u, tg_id) in enumerate(candidates, start=1):
            # Safety: telegram_id is unique
            exists = (
                db.query(User.id)
                .filter(User.telegram_id == tg_id)
                .filter(User.id != u.id)
                .first()
            )
            if exists:
                skipped_collision += 1
                continue

            old_user_tid = getattr(u, "telegram_id", None)
            u.telegram_id = tg_id
            # Keep legacy admin_profile.telegram_id aligned when profile exists and is empty.
            prof = getattr(u, "admin_profile", None)
            old_prof_tid = None
            new_prof_tid = None
            if prof is not None:
                old_prof_tid = str(getattr(prof, "telegram_id", "") or "")
                prof_tid = old_prof_tid.strip()
                if not prof_tid:
                    prof.telegram_id = str(tg_id)
                    new_prof_tid = str(tg_id)

            if log_writer is not None:
                log_writer.writerow(
                    [
                        int(u.id),
                        str(u.external_id),
                        "" if old_user_tid is None else int(old_user_tid),
                        int(tg_id),
                        "" if (old_prof_tid is None) else str(old_prof_tid),
                        "" if (new_prof_tid is None) else str(new_prof_tid),
                    ]
                )

            updated += 1
            if updated % max(1, int(args.batch_size)) == 0:
                db.commit()
                print(f"Committed batch: updated={updated} (processed={idx}/{total})")

        db.commit()
        print(f"Done. updated={updated}, skipped_collision={skipped_collision}, total_candidates={total}")
        return 0

    except Exception as exc:
        db.rollback()
        print("Error during backfill:", exc)
        raise
    finally:
        try:
            if 'log_fp' in locals() and log_fp is not None:
                log_fp.close()
        except Exception:
            pass
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
