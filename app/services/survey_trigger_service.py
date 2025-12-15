"""Survey trigger processing for gameplay/inactivity events."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Iterable

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.survey import Survey, SurveyResponse, SurveyResponseStatus, SurveyTriggerRule, SurveyTriggerType
from app.models.user import User


class SurveyTriggerService:
    """Match incoming events to trigger rules and create pending responses respecting cooldowns."""

    def __init__(self) -> None:
        self.now = datetime.utcnow

    def _eligible_rules(self, db: Session, trigger_type: SurveyTriggerType) -> list[SurveyTriggerRule]:
        stmt = select(SurveyTriggerRule).join(Survey).where(
            SurveyTriggerRule.trigger_type == trigger_type,
            SurveyTriggerRule.is_active == True,  # noqa: E712
            Survey.status == "ACTIVE",
        )
        return db.execute(stmt).scalars().all()

    def _passes_cooldown(self, db: Session, user_id: int, rule: SurveyTriggerRule) -> bool:
        if rule.cooldown_hours <= 0 and rule.max_per_user <= 0:
            return True
        recent_stmt = (
            select(SurveyResponse)
            .where(
                SurveyResponse.user_id == user_id,
                SurveyResponse.survey_id == rule.survey_id,
                SurveyResponse.trigger_rule_id == rule.id,
            )
            .order_by(SurveyResponse.id.desc())
        )
        recent = db.execute(recent_stmt).scalars().first()
        if not recent:
            return True
        if rule.max_per_user > 0:
            count_stmt = select(func.count()).select_from(SurveyResponse).where(
                SurveyResponse.user_id == user_id,
                SurveyResponse.survey_id == rule.survey_id,
                SurveyResponse.trigger_rule_id == rule.id,
            )
            total = db.execute(count_stmt).scalar_one()
            if total >= rule.max_per_user:
                return False
        if rule.cooldown_hours > 0 and recent.created_at:
            cutoff = self.now() - timedelta(hours=rule.cooldown_hours)
            if recent.created_at >= cutoff:
                return False
        return True

    def _create_pending(self, db: Session, user_id: int, rule: SurveyTriggerRule) -> SurveyResponse:
        response = SurveyResponse(
            survey_id=rule.survey_id,
            user_id=user_id,
            trigger_rule_id=rule.id,
            status=SurveyResponseStatus.PENDING,
            last_activity_at=self.now(),
        )
        db.add(response)
        db.commit()
        db.refresh(response)
        return response

    def handle_level_up(self, db: Session, user_id: int, new_level: int) -> list[int]:
        matched: list[int] = []
        for rule in self._eligible_rules(db, SurveyTriggerType.LEVEL_UP):
            cfg = rule.trigger_config_json or {}
            min_level = cfg.get("min_level") or cfg.get("level_min") or 0
            max_level = cfg.get("max_level") or cfg.get("level_max") or 10**9
            if new_level < min_level or new_level > max_level:
                continue
            if self._passes_cooldown(db, user_id, rule):
                resp = self._create_pending(db, user_id, rule)
                matched.append(resp.id)
        return matched

    def handle_game_result(self, db: Session, user_id: int, feature_type: str, result: str) -> list[int]:
        matched: list[int] = []
        for rule in self._eligible_rules(db, SurveyTriggerType.GAME_RESULT):
            cfg = rule.trigger_config_json or {}
            feature = cfg.get("feature_type")
            target_result = cfg.get("result")
            if feature and feature != feature_type:
                continue
            if target_result and target_result != result:
                continue
            if self._passes_cooldown(db, user_id, rule):
                resp = self._create_pending(db, user_id, rule)
                matched.append(resp.id)
        return matched

    def handle_inactive(self, db: Session, days_inactive: int) -> list[int]:
        matched: list[int] = []
        users_stmt = select(User).where(User.last_login_at != None)  # noqa: E711
        for user in db.execute(users_stmt).scalars().all():
            delta_days = (self.now().date() - user.last_login_at.date()).days if user.last_login_at else 0
            if delta_days < days_inactive:
                continue
            for rule in self._eligible_rules(db, SurveyTriggerType.INACTIVE_DAYS):
                cfg = rule.trigger_config_json or {}
                min_days = cfg.get("min_days") or cfg.get("days") or 3
                if delta_days < min_days:
                    continue
                if self._passes_cooldown(db, user.id, rule):
                    resp = self._create_pending(db, user.id, rule)
                    matched.append(resp.id)
        return matched

    def handle_manual_push(self, db: Session, user_ids: Iterable[int], survey_id: int | None = None) -> list[int]:
        matched: list[int] = []
        rules = self._eligible_rules(db, SurveyTriggerType.MANUAL_PUSH)
        if survey_id:
            rules = [r for r in rules if r.survey_id == survey_id]
        for uid in user_ids:
            for rule in rules:
                if self._passes_cooldown(db, uid, rule):
                    resp = self._create_pending(db, uid, rule)
                    matched.append(resp.id)
        return matched
