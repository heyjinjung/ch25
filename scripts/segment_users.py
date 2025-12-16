"""Batch segmentation job.

This is a minimal segmentation pass that updates `user_segment` based on available signals.

Segments produced (initial minimal set):
- NEW: default bucket for active/unknown users
- DORMANT_SHORT: inactive for N days
- DORMANT_LONG: inactive for M days
- VIP: external_ranking_data.deposit_amount >= threshold

Notes:
- In this codebase, "charge" time is derived from external_ranking_data updates.
- We intentionally keep the rules simple and configurable.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_segment import UserSegment
from app.services.admin_segment_rule_service import AdminSegmentRuleService
from app.services.segment_rules_engine import SegmentContext, matches_condition


@dataclass(frozen=True)
class SegmentRules:
    dormant_short_days: int = 7
    dormant_long_days: int = 14
    vip_deposit_threshold: int = 1_000_000


def _pick_segment(
    now: datetime,
    user_last_login_at: datetime | None,
    last_charge_at: datetime | None,
    deposit_amount: int,
    rules: SegmentRules,
) -> str:
    if deposit_amount >= rules.vip_deposit_threshold:
        return "VIP"

    last_active_at = None
    if user_last_login_at and last_charge_at:
        last_active_at = max(user_last_login_at, last_charge_at)
    else:
        last_active_at = user_last_login_at or last_charge_at

    if last_active_at is None:
        return "NEW"

    if last_active_at < now - timedelta(days=rules.dormant_long_days):
        return "DORMANT_LONG"
    if last_active_at < now - timedelta(days=rules.dormant_short_days):
        return "DORMANT_SHORT"

    return "NEW"


def _days_since(now: datetime, dt: datetime | None) -> int | None:
    if dt is None:
        return None
    return max(int((now - dt).total_seconds() // 86400), 0)


def _pick_segment_from_db_rules(
    now: datetime,
    *,
    ctx: SegmentContext,
    rules: list,
) -> str | None:
    for rule in rules:
        try:
            if matches_condition(rule.condition_json, ctx):
                return rule.segment
        except ValueError:
            # Invalid rule definition: skip (keeps job resilient)
            continue
    return None


def segment_all_users(db: Session, *, rules: SegmentRules, dry_run: bool = False) -> int:
    now = datetime.utcnow()

    db_rules = AdminSegmentRuleService.list_enabled_rules(db)

    users = db.execute(select(User)).scalars().all()
    updated = 0

    activity_by_user = {
        a.user_id: a for a in db.execute(select(UserActivity)).scalars().all()
    }
    ranking_by_user = {
        r.user_id: r for r in db.execute(select(ExternalRankingData)).scalars().all()
    }

    for user in users:
        activity = activity_by_user.get(user.id)
        ranking = ranking_by_user.get(user.id)

        last_login_at = user.last_login_at
        last_charge_at = (activity.last_charge_at if activity else None)
        last_active_at = None
        if last_login_at and last_charge_at:
            last_active_at = max(last_login_at, last_charge_at)
        else:
            last_active_at = last_login_at or last_charge_at

        deposit_amount = int(ranking.deposit_amount) if ranking else 0
        ctx = SegmentContext(
            last_login_at=last_login_at,
            last_charge_at=last_charge_at,
            last_active_at=last_active_at,
            days_since_last_login=_days_since(now, last_login_at),
            days_since_last_charge=_days_since(now, last_charge_at),
            days_since_last_active=_days_since(now, last_active_at),
            deposit_amount=deposit_amount,
            roulette_plays=getattr(activity, "roulette_plays", 0) if activity else 0,
            dice_plays=getattr(activity, "dice_plays", 0) if activity else 0,
            lottery_plays=getattr(activity, "lottery_plays", 0) if activity else 0,
            total_play_duration=getattr(activity, "total_play_duration", 0) if activity else 0,
        )

        segment = _pick_segment_from_db_rules(now, ctx=ctx, rules=db_rules)
        if not segment:
            segment = _pick_segment(
                now,
                user_last_login_at=last_login_at,
                last_charge_at=last_charge_at,
                deposit_amount=deposit_amount,
                rules=rules,
            )

        existing = db.get(UserSegment, user.id)
        if existing is None:
            if not dry_run:
                db.add(UserSegment(user_id=user.id, segment=segment))
            updated += 1
            continue

        if existing.segment != segment:
            if not dry_run:
                existing.segment = segment
                db.add(existing)
            updated += 1

    if not dry_run:
        db.commit()

    return updated


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Segment users into user_segment table")
    parser.add_argument("--dry-run", action="store_true", help="Do not write DB changes")
    parser.add_argument("--dormant-short-days", type=int, default=7)
    parser.add_argument("--dormant-long-days", type=int, default=14)
    parser.add_argument("--vip-deposit-threshold", type=int, default=1_000_000)
    args = parser.parse_args()

    rules = SegmentRules(
        dormant_short_days=args.dormant_short_days,
        dormant_long_days=args.dormant_long_days,
        vip_deposit_threshold=args.vip_deposit_threshold,
    )

    db = SessionLocal()
    try:
        changed = segment_all_users(db, rules=rules, dry_run=args.dry_run)
    finally:
        db.close()

    mode = "DRY_RUN" if args.dry_run else "APPLIED"
    print(f"[{mode}] segmented users changed={changed}")


if __name__ == "__main__":
    main()
