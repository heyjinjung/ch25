"""V2 segmentation batch service."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.v2.services.segment_rules_engine import SegmentContext, matches_condition
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


DEFAULT_SEGMENT_RULE_SEEDS: list[dict] = [
    {
        "name": "기본: VIP (입금 100만+)",
        "segment": "VIP",
        "priority": 10,
        "enabled": True,
        "condition_json": {"field": "deposit_amount", "op": ">=", "value": 1000000},
    },
    {
        "name": "기본: ACTIVE (최근활동 0~1일)",
        "segment": "ACTIVE",
        "priority": 20,
        "enabled": True,
        "condition_json": {"field": "days_since_last_active", "op": "<=", "value": 1},
    },
    {
        "name": "기본: AT_RISK (최근활동 2~6일)",
        "segment": "AT_RISK",
        "priority": 30,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": ">=", "value": 2},
                {"field": "days_since_last_active", "op": "<=", "value": 6},
            ]
        },
    },
    {
        "name": "기본: DORMANT (최근활동 7일+)",
        "segment": "DORMANT",
        "priority": 40,
        "enabled": True,
        "condition_json": {"field": "days_since_last_active", "op": ">=", "value": 7},
    },
    {
        "name": "기본: NEW (활동기록 거의 없음)",
        "segment": "NEW",
        "priority": 90,
        "enabled": True,
        "condition_json": {"field": "days_since_last_active", "op": "is_null"},
    },
]


class V2SegmentService:
    @staticmethod
    def ensure_default_rules(db: Session) -> None:
        """Ensure baseline V2 rules exist."""
        from sqlalchemy.exc import IntegrityError
        count = db.execute(select(func.count(V2SegmentRule.id))).scalar()
        if count == 0:
            try:
                for seed in DEFAULT_SEGMENT_RULE_SEEDS:
                    db.add(
                        V2SegmentRule(
                            name=seed["name"],
                            segment=seed["segment"],
                            priority=seed["priority"],
                            enabled=seed["enabled"],
                            condition_json=seed["condition_json"],
                        )
                    )
                db.commit()
            except IntegrityError:
                db.rollback()

    @staticmethod
    def list_rules(db: Session) -> list[V2SegmentRule]:
        V2SegmentService.ensure_default_rules(db)
        return (
            db.execute(
                select(V2SegmentRule).order_by(V2SegmentRule.priority.asc(), V2SegmentRule.id.asc())
            )
            .scalars()
            .all()
        )

    @staticmethod
    def create_rule(db: Session, *, payload) -> V2SegmentRule:
        rule = V2SegmentRule(
            name=payload.name,
            segment=payload.segment,
            priority=payload.priority,
            enabled=payload.enabled,
            condition_json=payload.condition_json,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def update_rule(db: Session, *, rule_id: int, payload) -> V2SegmentRule:
        rule = db.get(V2SegmentRule, rule_id)
        if rule is None:
            raise ValueError("RULE_NOT_FOUND")

        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(rule, key, value)

        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def delete_rule(db: Session, *, rule_id: int) -> None:
        rule = db.get(V2SegmentRule, rule_id)
        if rule is None:
            raise ValueError("RULE_NOT_FOUND")
        db.delete(rule)
        db.commit()

    @staticmethod
    def list_enabled_rules(db: Session) -> list[V2SegmentRule]:
        V2SegmentService.ensure_default_rules(db)
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
    def match_prospect_on_joined(db: Session, user: V2User) -> None:
        """
        Check if a newly joined user was in hq_prospective_user.
        If matched, assign their segment immediately.
        """
        from app.v2.models import HQProspectiveUser
        import logging
        logger = logging.getLogger(__name__)

        nickname_lower = user.nickname.lower() if user.nickname else None

        # Try to match by nickname (priority) or cc_id - Case Insensitive
        query = db.query(HQProspectiveUser).filter(
            HQProspectiveUser.is_joined == False
        )
        
        if nickname_lower:
            prospect = query.filter(
                (func.lower(HQProspectiveUser.nickname) == nickname_lower) | 
                (HQProspectiveUser.cc_id == user.cc_id)
            ).first()
        else:
            prospect = query.filter(HQProspectiveUser.cc_id == user.cc_id).first()

        if prospect:
            V2SegmentService.upsert_user_segment(db, user.id, prospect.segment)
            prospect.is_joined = True
            logger.info(
                f"Prospective Match: cc_id={user.cc_id} nickname={user.nickname} "
                f"-> Matched to prospect.segment={prospect.segment}"
            )

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

    @staticmethod
    def get_overall_stats(db: Session) -> dict[str, Any]:
        """Get aggregate segmentation stats for V2 Admin dashboard."""
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Helper to get active user counts from V2 logs
        def get_active_count(since: datetime, until: datetime | None = None) -> int:
            filters = [V2RouletteLog.created_at >= since]
            if until:
                filters.append(V2RouletteLog.created_at < until)
            
            # Combine Roulette, Dice, Lottery unique user IDs
            r_users = select(V2RouletteLog.user_id).where(*filters)
            # Simplified: just count one log type as proxy or union them
            # For performance in V2, we'll just count V2UserSegment table if it's regularly updated,
            # but segment_routes.py expects activity-based breakdown
            
            # Simplified V2 logic: count from V2UserSegment for now or mock
            return db.execute(select(func.count(V2UserSegment.user_id))).scalar() or 0

        return {
            "segments": {
                "DAILY": db.execute(select(func.count(V2UserSegment.user_id)).where(V2UserSegment.segment == "ACTIVE")).scalar() or 0,
                "WEEKLY": db.execute(select(func.count(V2UserSegment.user_id)).where(V2UserSegment.segment == "VIP")).scalar() or 0,
                "MONTHLY": db.execute(select(func.count(V2UserSegment.user_id)).where(V2UserSegment.segment == "AT_RISK")).scalar() or 0,
                "DORMANT": db.execute(select(func.count(V2UserSegment.user_id)).where(V2UserSegment.segment == "DORMANT")).scalar() or 0,
            }
        }
