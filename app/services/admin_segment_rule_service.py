"""Admin CRUD for segment_rule and helpers for segmentation jobs."""

from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.segment_rule import SegmentRule


DEFAULT_SEGMENT_RULE_SEEDS: list[dict] = [
    # 운영 단순화 세그 (5종): NEW / ACTIVE / AT_RISK / DORMANT / VIP
    # - segment는 저장/필터/타깃팅 키로 쓰이므로 ASCII(대문자/언더스코어) 유지
    # - 한글 표시는 어드민 UI에서 라벨로 매핑
    {
        "name": "기본: VIP (입금 100만+ / 최근활동 7일+)",
        "segment": "VIP",
        "priority": 10,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "deposit_amount", "op": ">=", "value": 1000000},
                {"field": "days_since_last_active", "op": ">=", "value": 7},
            ]
        },
    },
    {
        "name": "기본: VIP (입금 100만+ / 최근활동 0~6일)",
        "segment": "VIP",
        "priority": 11,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "deposit_amount", "op": ">=", "value": 1000000},
                {"field": "days_since_last_active", "op": "<=", "value": 6},
            ]
        },
    },
    {
        "name": "기본: ACTIVE (최근활동 0~1일 / 최근충전 0~2일)",
        "segment": "ACTIVE",
        "priority": 20,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": "<=", "value": 1},
                {"field": "days_since_last_charge", "op": "<=", "value": 2},
            ]
        },
    },
    {
        "name": "기본: ACTIVE (최근활동 0~1일)",
        "segment": "ACTIVE",
        "priority": 21,
        "enabled": True,
        "condition_json": {"field": "days_since_last_active", "op": "<=", "value": 1},
    },
    {
        "name": "기본: AT_RISK (최근활동 2~6일 / 최근충전 3일+ 또는 정보없음)",
        "segment": "AT_RISK",
        "priority": 30,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": ">=", "value": 2},
                {"field": "days_since_last_active", "op": "<=", "value": 6},
                {
                    "any": [
                        {"field": "days_since_last_charge", "op": ">=", "value": 3},
                        {"field": "days_since_last_charge", "op": "is_null"},
                    ]
                },
            ]
        },
    },
    {
        "name": "기본: AT_RISK (최근활동 2~6일)",
        "segment": "AT_RISK",
        "priority": 31,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": ">=", "value": 2},
                {"field": "days_since_last_active", "op": "<=", "value": 6},
            ]
        },
    },
    {
        "name": "기본: DORMANT (최근활동 14일+)",
        "segment": "DORMANT",
        "priority": 40,
        "enabled": True,
        "condition_json": {"field": "days_since_last_active", "op": ">=", "value": 14},
    },
    {
        "name": "기본: DORMANT (최근활동 7~13일)",
        "segment": "DORMANT",
        "priority": 41,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": ">=", "value": 7},
                {"field": "days_since_last_active", "op": "<=", "value": 13},
            ]
        },
    },
    {
        "name": "기본: NEW (입금 0 / 초반 활동 단계)",
        "segment": "NEW",
        "priority": 80,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "deposit_amount", "op": "==", "value": 0},
                {"field": "days_since_last_active", "op": "<=", "value": 3},
            ]
        },
    },
    {
        "name": "기본: NEW (활동기록 없음/입금 0)",
        "segment": "NEW",
        "priority": 90,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": "is_null"},
                {"field": "deposit_amount", "op": "==", "value": 0},
            ]
        },
    },
    {
        "name": "기본: DORMANT (활동기록 없음/입금 존재)",
        "segment": "DORMANT",
        "priority": 91,
        "enabled": True,
        "condition_json": {
            "all": [
                {"field": "days_since_last_active", "op": "is_null"},
                {"field": "deposit_amount", "op": ">", "value": 0},
            ]
        },
    },
]


class AdminSegmentRuleService:
    @staticmethod
    def ensure_default_rules(db: Session) -> None:
        """Ensure baseline rules exist.

        - If DB is empty: seed defaults.
        - If DB has only previously auto-seeded rules (name starts with 'DEFAULT_' or '기본:'):
          replace them with the current default set.
        - If DB has any custom rule: do nothing.

        This keeps the admin '추천' column useful even on fresh DBs or short history,
        while avoiding overwriting operational/customized rules.
        """

        existing = db.query(SegmentRule).order_by(SegmentRule.id.asc()).all()
        if not existing:
            try:
                for seed in DEFAULT_SEGMENT_RULE_SEEDS:
                    db.add(
                        SegmentRule(
                            name=seed["name"],
                            segment=seed["segment"],
                            priority=seed["priority"],
                            enabled=seed["enabled"],
                            condition_json=seed["condition_json"],
                        )
                    )
                db.commit()
            except IntegrityError:
                # Concurrent seed attempt; safe to ignore.
                db.rollback()
            return

        # If there is any custom rule, never touch.
        is_auto_seed_only = all(
            (r.name or "").startswith("DEFAULT_") or (r.name or "").startswith("기본:") for r in existing
        )
        if not is_auto_seed_only:
            return

        # Replace only when the set differs (prevents unnecessary churn).
        desired_names = {s["name"] for s in DEFAULT_SEGMENT_RULE_SEEDS}
        existing_names = {r.name for r in existing}
        if existing_names == desired_names:
            return

        try:
            for r in existing:
                db.delete(r)
            for seed in DEFAULT_SEGMENT_RULE_SEEDS:
                db.add(
                    SegmentRule(
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
    def list_rules(db: Session) -> list[SegmentRule]:
        AdminSegmentRuleService.ensure_default_rules(db)
        return (
            db.query(SegmentRule)
            .order_by(SegmentRule.priority.asc(), SegmentRule.id.asc())
            .all()
        )

    @staticmethod
    def list_enabled_rules(db: Session) -> list[SegmentRule]:
        AdminSegmentRuleService.ensure_default_rules(db)
        return (
            db.query(SegmentRule)
            .filter(SegmentRule.enabled.is_(True))
            .order_by(SegmentRule.priority.asc(), SegmentRule.id.asc())
            .all()
        )

    @staticmethod
    def create_rule(db: Session, *, payload) -> SegmentRule:
        rule = SegmentRule(
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
    def update_rule(db: Session, *, rule_id: int, payload) -> SegmentRule:
        rule = db.get(SegmentRule, rule_id)
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
        rule = db.get(SegmentRule, rule_id)
        if rule is None:
            raise ValueError("RULE_NOT_FOUND")
        db.delete(rule)
        db.commit()
