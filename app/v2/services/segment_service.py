"""V2 segmentation batch service."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.services.segment_rules_engine import SegmentContext, matches_condition
from app.v2.models.v2_segment_rule import V2SegmentRule
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_roulette import V2RouletteLog
from app.v2.models.v2_dice import V2DiceLog
from app.v2.models.v2_lottery import V2LotteryLog
from app.v2.models.user import V2User


@dataclass(frozen=True)
class SegmentResult:
    user_id: int
    segment: str
    matched_rule: str | None


class V2SegmentService:
    @staticmethod
    def list_enabled_rules(db: Session) -> list[V2SegmentRule]:
        return (
            db.execute(
                select(V2SegmentRule)
                .where(V2SegmentRule.enabled.is_(True))
                .order_by(V2SegmentRule.priority.asc(), V2SegmentRule.id.asc())
            )
            .scalars()
            .all()
        )

    @staticmethod
    def _get_last_play_at(db: Session, user_id: int) -> datetime | None:
        roulette_last = db.execute(
            select(func.max(V2RouletteLog.created_at)).where(V2RouletteLog.user_id == user_id)
        ).scalar_one_or_none()
        dice_last = db.execute(
            select(func.max(V2DiceLog.created_at)).where(V2DiceLog.user_id == user_id)
        ).scalar_one_or_none()
        lottery_last = db.execute(
            select(func.max(V2LotteryLog.created_at)).where(V2LotteryLog.user_id == user_id)
        ).scalar_one_or_none()
        candidates = [dt for dt in [roulette_last, dice_last, lottery_last] if dt is not None]
        return max(candidates) if candidates else None

    @staticmethod
    def _build_context(db: Session, user: V2User, now: datetime) -> SegmentContext:
        last_play_at = V2SegmentService._get_last_play_at(db, user.id)
        days_since_last_play = (now - last_play_at).days if last_play_at else None

        roulette_plays = db.execute(
            select(func.count()).select_from(V2RouletteLog).where(V2RouletteLog.user_id == user.id)
        ).scalar_one()
        dice_plays = db.execute(
            select(func.count()).select_from(V2DiceLog).where(V2DiceLog.user_id == user.id)
        ).scalar_one()
        lottery_plays = db.execute(
            select(func.count()).select_from(V2LotteryLog).where(V2LotteryLog.user_id == user.id)
        ).scalar_one()

        return SegmentContext(
            last_login_at=None,
            last_charge_at=None,
            last_play_at=last_play_at,
            last_active_at=last_play_at,
            days_since_last_login=None,
            days_since_last_charge=None,
            days_since_last_play=days_since_last_play,
            days_since_last_active=days_since_last_play,
            deposit_amount=0,
            roulette_plays=int(roulette_plays or 0),
            dice_plays=int(dice_plays or 0),
            lottery_plays=int(lottery_plays or 0),
            total_play_duration=0,
            level=1,
            xp=0,
            cash_balance=0.0,
            vault_balance=float(user.vault_locked_balance or 0),
            login_streak=0,
        )

    @staticmethod
    def _recommend_segment(rules: list[V2SegmentRule], ctx: SegmentContext) -> tuple[str, str] | None:
        for rule in rules:
            condition = rule.condition_json
            if not isinstance(condition, dict):
                continue
            try:
                if matches_condition(condition, ctx):
                    return rule.segment, rule.name
            except Exception:
                continue
        return None

    @staticmethod
    def upsert_user_segment(db: Session, user_id: int, segment: str) -> V2UserSegment:
        row = db.get(V2UserSegment, user_id)
        if row is None:
            row = V2UserSegment(user_id=user_id, segment=segment)
        else:
            row.segment = segment
        db.add(row)
        db.flush()
        return row

    @staticmethod
    def segment_user(db: Session, user_id: int, now: datetime | None = None) -> SegmentResult:
        user = db.get(V2User, user_id)
        if user is None:
            raise ValueError("USER_NOT_FOUND")

        rules = V2SegmentService.list_enabled_rules(db)
        ctx = V2SegmentService._build_context(db, user, now or datetime.utcnow())
        rec = V2SegmentService._recommend_segment(rules, ctx)

        if rec is None:
            existing = db.get(V2UserSegment, user_id)
            segment_value = existing.segment if existing else "NEW"
            return SegmentResult(user_id=user_id, segment=segment_value, matched_rule=None)

        segment_value, rule_name = rec
        V2SegmentService.upsert_user_segment(db, user_id, segment_value)
        return SegmentResult(user_id=user_id, segment=segment_value, matched_rule=rule_name)

    @staticmethod
    def segment_all_users(db: Session, now: datetime | None = None) -> dict[str, Any]:
        now_dt = now or datetime.utcnow()
        users = db.execute(select(V2User.id)).scalars().all()
        changed = 0
        processed = 0
        for user_id in users:
            processed += 1
            before = db.get(V2UserSegment, user_id)
            before_segment = before.segment if before else None
            result = V2SegmentService.segment_user(db, user_id, now_dt)
            if result.segment != (before_segment or "NEW"):
                changed += 1
        db.commit()
        return {"processed": processed, "changed": changed}
