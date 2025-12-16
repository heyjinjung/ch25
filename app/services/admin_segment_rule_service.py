"""Admin CRUD for segment_rule and helpers for segmentation jobs."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.segment_rule import SegmentRule


class AdminSegmentRuleService:
    @staticmethod
    def list_rules(db: Session) -> list[SegmentRule]:
        return (
            db.query(SegmentRule)
            .order_by(SegmentRule.priority.asc(), SegmentRule.id.asc())
            .all()
        )

    @staticmethod
    def list_enabled_rules(db: Session) -> list[SegmentRule]:
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
