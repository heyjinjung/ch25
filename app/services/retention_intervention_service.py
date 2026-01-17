"""Retention intervention resolution and predictive re-engagement helpers."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.event import EventParticipationLog
from app.models.retention_roi_log import RetentionRoiLog
from app.models.user import User
from app.models.user_retention_state import UserRetentionState
from app.services.ch25_event_service import Ch25EventService
from app.services.ops_log_service import OpsLogService

logger = logging.getLogger(__name__)


class RetentionInterventionService:
    """Resolve intervention rewards and log ROI evidence."""

    R0 = 0.25
    ALPHA = 0.015
    BETA = 0.10
    TARGET_ROI_RATIO = 3

    SEGMENT_BASE_RATE: dict[str, float] = {
        "HIGH_ROLLER": 0.04,
        "CASUAL_LOYAL": 0.02,
        "NEW_USER": 0.02,
        "CHURN_RISK": 0.03,
    }

    EVENT_BASE_REWARD: dict[str, int] = {
        "LOSS_STREAK": 3000,
        "ASSET_DEPLETION": 5000,
        "SESSION_END": 2000,
    }

    def resolve_intervention(self, db: Session, *, user_id: int, event_type: str, data: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()

        if not settings.ch25_intervention_enabled:
            return {
                "eligible": False,
                "reason": "INTERVENTION_DISABLED",
            }

        group = Ch25EventService._assign_experiment_group(user_id, settings)
        if group == "CONTROL":
            return {
                "eligible": False,
                "reason": "CONTROL_GROUP",
                "experiment_group": group,
            }

        state = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
        churn_prob = float(getattr(state, "churn_probability_score", 0) or 0)
        churn_prob = min(max(churn_prob, 0.0), 1.0)
        segment = str(getattr(state, "user_segment_tag", "NEW_USER") or "NEW_USER")
        predicted_ltv = float(getattr(state, "predicted_ltv", 0) or 0)

        if predicted_ltv <= 0:
            predicted_ltv = self._fallback_predicted_ltv(db, user_id)

        base_reward = self._resolve_base_reward(event_type, data)
        base_rate = float(self.SEGMENT_BASE_RATE.get(segment, 0.02))
        ltv_reward = predicted_ltv * base_rate * max(churn_prob, 0.1)
        raw_reward = max(base_reward, int(ltv_reward))

        decayed_reward, decay_factor = self._apply_value_decay(db, user_id, event_type, raw_reward)

        reward_type = self._resolve_reward_type(group)
        capped_reward, cmax = self._apply_cmax(db, user_id, predicted_ltv, decayed_reward)

        roi_percent = self._log_roi(db, user_id, predicted_ltv, capped_reward, event_type, reward_type)

        if capped_reward > 0:
            self._touch_last_intervention(db, user_id)

        return {
            "eligible": capped_reward > 0,
            "experiment_group": group,
            "reward_type": reward_type,
            "reward_amount": capped_reward,
            "capped_amount": capped_reward,
            "cmax": cmax,
            "predicted_ltv": predicted_ltv,
            "roi_percent": roi_percent,
            "meta": {
                "segment": segment,
                "churn_probability": churn_prob,
                "base_reward": base_reward,
                "raw_reward": raw_reward,
                "decay_factor": decay_factor,
            },
        }

    def enqueue_reengagement(self, db: Session, *, user_id: int, reason: str | None, channel: str) -> dict[str, Any]:
        state = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
        churn_prob = float(getattr(state, "churn_probability_score", 0) or 0)
        segment = str(getattr(state, "user_segment_tag", "NEW_USER") or "NEW_USER")

        is_candidate = churn_prob >= 0.7 or segment == "CHURN_RISK"
        if not is_candidate:
            return {
                "queued": False,
                "created": False,
                "reason": "NOT_ELIGIBLE",
                "meta": {"churn_probability": churn_prob, "segment": segment},
            }

        service = OpsLogService()
        log_date = date.today()
        ref_id = f"reengagement:{user_id}:{log_date.isoformat()}"
        meta = {
            "trigger": "PREDICTIVE_REENGAGEMENT",
            "churn_probability": churn_prob,
            "segment": segment,
            "channel": channel,
            "reason": reason,
        }
        entry, created = service.create_log_entry(
            db,
            log_date=log_date,
            category="RETENTION",
            action_code="OFFER_PERSONALIZED_TRACKED",
            target_model="USER",
            target_id=str(user_id),
            meta_data=meta,
            is_automated=True,
            actor_id=0,
            ref_id=ref_id,
        )
        return {
            "queued": True,
            "created": created,
            "reason": None,
            "meta": {"entry_id": entry.id, "churn_probability": churn_prob, "segment": segment},
        }

    def _fallback_predicted_ltv(self, db: Session, user_id: int) -> float:
        from app.models.external_ranking import ExternalRankingData

        row = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        if not row:
            return 0.0
        return float(row.deposit_amount or 0)

    def _resolve_base_reward(self, event_type: str, data: dict[str, Any]) -> int:
        explicit = data.get("reward_amount")
        if explicit is not None:
            try:
                return max(int(explicit), 0)
            except (TypeError, ValueError):
                pass

        loss_amount = data.get("session_loss") or data.get("loss_amount") or data.get("bet_amount") or 0
        try:
            loss_amount = abs(int(loss_amount))
        except (TypeError, ValueError):
            loss_amount = 0
        if loss_amount > 0:
            return max(1000, min(50000, int(loss_amount * 0.1)))
        return int(self.EVENT_BASE_REWARD.get(event_type, 2000))

    def _apply_value_decay(self, db: Session, user_id: int, event_type: str, base_reward: int) -> tuple[int, float]:
        lookback = datetime.utcnow() - timedelta(days=7)
        count = (
            db.query(func.count(EventParticipationLog.id))
            .filter(
                EventParticipationLog.user_id == user_id,
                EventParticipationLog.event_type == event_type,
                EventParticipationLog.participated_at >= lookback,
            )
            .scalar()
            or 0
        )
        decay_factor = 1 / (1 + self.BETA * int(count))
        reward = int(round(base_reward * decay_factor))
        return max(reward, 0), decay_factor

    def _apply_cmax(self, db: Session, user_id: int, predicted_ltv: float, reward_amount: int) -> tuple[int, int | None]:
        if reward_amount <= 0:
            return 0, None

        user = db.query(User).filter(User.id == user_id).first()
        if user and (datetime.utcnow() - user.created_at).days < 7:
            return reward_amount, None

        if predicted_ltv <= 0:
            return 0, 0

        cmax = int(predicted_ltv / self.TARGET_ROI_RATIO)
        capped = min(int(reward_amount), max(cmax, 0))
        return capped, cmax

    def _resolve_reward_type(self, group: str) -> str:
        mapping = {
            "FREE_SPIN": "FREE_SPIN",
            "CASHBACK": "CASHBACK",
            "MISSION": "MISSION",
        }
        return mapping.get(group, "FREE_SPIN")

    def _log_roi(self, db: Session, user_id: int, predicted_ltv: float, reward_amount: int, event_type: str, reward_type: str) -> float:
        if reward_amount <= 0:
            return 0.0

        marketing_cost = float(reward_amount)
        if marketing_cost <= 0:
            return 0.0

        roi_percent = ((predicted_ltv - marketing_cost) / marketing_cost) * 100
        try:
            entry = RetentionRoiLog(
                user_id=user_id,
                predicted_ltv=predicted_ltv,
                marketing_cost=marketing_cost,
                roi_percent=roi_percent,
                event_type=event_type,
                reward_type=reward_type,
                reward_amount=reward_amount,
            )
            db.add(entry)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("retention ROI log failed", exc_info=exc)
        return roi_percent

    def _touch_last_intervention(self, db: Session, user_id: int) -> None:
        try:
            state = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
            if not state:
                return
            state.last_intervention_at = datetime.utcnow()
            db.add(state)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("retention state update failed", exc_info=exc)
