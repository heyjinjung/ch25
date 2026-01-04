"""Admin service for user segmentation and activity inspection."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.external_ranking import ExternalRankingData
from app.models.segment_rule import SegmentRule
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_segment import UserSegment
from app.services.admin_segment_rule_service import AdminSegmentRuleService
from app.services.segment_rules_engine import SegmentContext, matches_condition


@dataclass(frozen=True)
class AdminSegmentRow:
    user_id: int
    external_id: str
    nickname: str | None
    telegram_username: str | None
    segment: str
    segment_updated_at: datetime | None

    roulette_plays: int
    dice_plays: int
    lottery_plays: int
    total_play_duration: int

    last_login_at: datetime | None
    last_charge_at: datetime | None
    last_bonus_used_at: datetime | None
    activity_updated_at: datetime | None

    recommended_segment: str | None
    recommended_rule_name: str | None
    recommended_reason: str | None


def _days_since(now: datetime, dt: datetime | None) -> int | None:
    if dt is None:
        return None
    return max(0, (now - dt).days)


def _max_dt(*items: datetime | None) -> datetime | None:
    existing = [d for d in items if d is not None]
    return max(existing) if existing else None


def _recommend_segment(rules: list[SegmentRule], ctx: SegmentContext) -> tuple[str, str] | None:
    for rule in rules:
        try:
            condition = rule.condition_json
            if isinstance(condition, dict) and matches_condition(condition, ctx):
                return rule.segment, rule.name
        except Exception:
            # Bad/unsupported rule shouldn't break admin listing
            continue
    return None


def _format_recommendation_reason(ctx: SegmentContext) -> str:
    deposit = f"{ctx.deposit_amount:,}"

    def fmt_days(label: str, value: int | None) -> str:
        if value is None:
            return f"{label} 정보없음"
        return f"{label} {value}일 전"

    last_active = fmt_days("최근활동", ctx.days_since_last_active)
    last_charge = fmt_days("최근충전", ctx.days_since_last_charge)
    plays = f"룰렛 {ctx.roulette_plays} / 주사위 {ctx.dice_plays} / 복권 {ctx.lottery_plays}"
    return f"입금 {deposit} / {last_active} / {last_charge} / {plays}"


def _segment_playbook(segment: str, ctx: SegmentContext) -> str:
    s = (segment or "").strip().upper()
    if s == "NEW":
        # Early stage: show path-to-value and first conversion.
        return "액션: 온보딩/첫 미션/첫 충전 유도(가벼운 혜택)"
    if s == "ACTIVE":
        return "액션: 데일리 리텐션(미션·연속출석) + 게임 루프 강화"
    if s == "AT_RISK":
        # Trigger stronger reactivation if no recent charge.
        if ctx.days_since_last_charge is None or ctx.days_since_last_charge >= 3:
            return "액션: 이탈방지 리마인드 + 복귀 혜택(기간/조건 명확)"
        return "액션: 복귀 리마인드(가벼운 혜택)"
    if s == "DORMANT":
        return "액션: 윈백(강한 혜택) + 1회성 목표 제시(미션/쿠폰)"
    if s == "VIP":
        if ctx.days_since_last_active is not None and ctx.days_since_last_active >= 7:
            return "액션: VIP 휴면 케어(개별 연락/맞춤 혜택/복귀 플랜)"
        return "액션: VIP 케어(전용 혜택/우선 지원/맞춤 이벤트)"
    return "액션: 운영 정책에 맞춰 조정"


class AdminSegmentService:
    @staticmethod
    def list_segments(
        db: Session,
        *,
        user_id: int | None = None,
        external_id: str | None = None,
        limit: int = 200,
    ) -> list[AdminSegmentRow]:
        cleaned_external = external_id.strip() if external_id else None
        now = datetime.utcnow()
        enabled_rules = AdminSegmentRuleService.list_enabled_rules(db)
        q = (
            db.query(User, UserSegment, UserActivity, ExternalRankingData)
            .outerjoin(UserSegment, UserSegment.user_id == User.id)
            .outerjoin(UserActivity, UserActivity.user_id == User.id)
            .outerjoin(ExternalRankingData, ExternalRankingData.user_id == User.id)
        )
        if user_id is not None:
            q = q.filter(User.id == user_id)
        elif cleaned_external:
            q = q.filter(User.external_id == cleaned_external)

        rows = q.order_by(User.id.desc()).limit(limit).all()
        result: list[AdminSegmentRow] = []
        for user, seg, act, ext in rows:
            segment_value = seg.segment if seg else "NEW"

            last_login_at = getattr(act, "last_login_at", None) if act else None
            last_charge_at = getattr(act, "last_charge_at", None) if act else None
            last_play_at = getattr(act, "last_play_at", None) if act else None
            last_active_at = _max_dt(last_login_at, last_charge_at, last_play_at)

            ctx = SegmentContext(
                last_login_at=last_login_at,
                last_charge_at=last_charge_at,
                last_play_at=last_play_at,
                last_active_at=last_active_at,
                days_since_last_login=_days_since(now, last_login_at),
                days_since_last_charge=_days_since(now, last_charge_at),
                days_since_last_play=_days_since(now, last_play_at),
                days_since_last_active=_days_since(now, last_active_at),
                deposit_amount=getattr(ext, "deposit_amount", 0) if ext else 0,
                roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
                dice_plays=getattr(act, "dice_plays", 0) if act else 0,
                lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
                total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
            )
            rec = _recommend_segment(enabled_rules, ctx)
            result.append(
                AdminSegmentRow(
                    user_id=user.id,
                    external_id=user.external_id,
                    nickname=user.nickname,
                    telegram_username=user.telegram_username,
                    segment=segment_value,
                    segment_updated_at=getattr(seg, "updated_at", None) if seg else None,
                    roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
                    dice_plays=getattr(act, "dice_plays", 0) if act else 0,
                    lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
                    total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
                    last_login_at=last_login_at,
                    last_charge_at=last_charge_at,
                    last_bonus_used_at=getattr(act, "last_bonus_used_at", None) if act else None,
                    activity_updated_at=getattr(act, "updated_at", None) if act else None,
                    recommended_segment=rec[0] if rec else None,
                    recommended_rule_name=rec[1] if rec else None,
                    recommended_reason=(
                        f"{_format_recommendation_reason(ctx)} / {_segment_playbook(rec[0], ctx)}" if rec else None
                    ),
                )
            )
        return result

    @staticmethod
    def upsert_segment(
        db: Session,
        *,
        user_id: int | None = None,
        external_id: str | None = None,
        segment: str,
    ) -> AdminSegmentRow:
        cleaned_external = external_id.strip() if external_id else None

        user: User | None = None
        if cleaned_external:
            user = db.query(User).filter(User.external_id == cleaned_external).first()
        if user is None and user_id is not None:
            user = db.get(User, user_id)
        if user is None:
            raise ValueError("USER_NOT_FOUND")

        seg = db.query(UserSegment).filter(UserSegment.user_id == user.id).first()
        if seg is None:
            seg = UserSegment(user_id=user.id, segment=segment)
        else:
            seg.segment = segment
        db.add(seg)
        db.commit()
        db.refresh(seg)

        # Return a single-row view (with activity if exists)
        act = db.query(UserActivity).filter(UserActivity.user_id == user.id).first()
        ext = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user.id).first()
        now = datetime.utcnow()
        enabled_rules = AdminSegmentRuleService.list_enabled_rules(db)
        last_login_at = getattr(act, "last_login_at", None) if act else None
        last_charge_at = getattr(act, "last_charge_at", None) if act else None
        last_play_at = getattr(act, "last_play_at", None) if act else None
        last_active_at = _max_dt(last_login_at, last_charge_at, last_play_at)
        ctx = SegmentContext(
            last_login_at=last_login_at,
            last_charge_at=last_charge_at,
            last_play_at=last_play_at,
            last_active_at=last_active_at,
            days_since_last_login=_days_since(now, last_login_at),
            days_since_last_charge=_days_since(now, last_charge_at),
            days_since_last_play=_days_since(now, last_play_at),
            days_since_last_active=_days_since(now, last_active_at),
            deposit_amount=getattr(ext, "deposit_amount", 0) if ext else 0,
            roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
            dice_plays=getattr(act, "dice_plays", 0) if act else 0,
            lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
            total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
        )
        rec = _recommend_segment(enabled_rules, ctx)
        return AdminSegmentRow(
            user_id=user.id,
            external_id=user.external_id,
            nickname=user.nickname,
            telegram_username=user.telegram_username,
            segment=seg.segment,
            segment_updated_at=seg.updated_at,
            roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
            dice_plays=getattr(act, "dice_plays", 0) if act else 0,
            lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
            total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
            last_login_at=last_login_at,
            last_charge_at=last_charge_at,
            last_bonus_used_at=getattr(act, "last_bonus_used_at", None) if act else None,
            activity_updated_at=getattr(act, "updated_at", None) if act else None,
            recommended_segment=rec[0] if rec else None,
            recommended_rule_name=rec[1] if rec else None,
            recommended_reason=(f"{_format_recommendation_reason(ctx)} / {_segment_playbook(rec[0], ctx)}" if rec else None),
        )
