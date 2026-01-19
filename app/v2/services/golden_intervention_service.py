"""Golden V2 intervention service - Real-time trigger detection and action execution."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog
from app.v2.models.v2_user_retention_state import V2UserRetentionState

logger = logging.getLogger(__name__)


class GoldenInterventionService:
    """Detects intervention triggers and executes appropriate actions."""

    def __init__(self, db: Session):
        self.db = db

    def check_lose_streak_trigger(
        self,
        user_id: int,
        recent_results: list[str],
        cooldown_hours: int = 1,
    ) -> Optional[V2GoldenInterventionLog]:
        """
        Check TRG_LOSE_5: Last 5 game results all "LOSE".

        Args:
            user_id: The user ID
            recent_results: List of recent game results (e.g., ["LOSE", "LOSE", "WIN", "LOSE", "LOSE"])
            cooldown_hours: Cooldown period in hours (default 1h per SoT)

        Returns:
            Intervention log if triggered, None if not triggered or on cooldown
        """
        # Check if last 5 results are all LOSE
        if len(recent_results) < 5:
            return None

        last_5 = recent_results[-5:]
        if not all(result == "LOSE" for result in last_5):
            return None

        # Check cooldown
        if self._is_on_cooldown(user_id, "TRG_LOSE_5", cooldown_hours):
            logger.info(f"TRG_LOSE_5 on cooldown for user {user_id}")
            return None

        # Trigger intervention
        logger.warning(f"TRG_LOSE_5 triggered for user {user_id}: 5 consecutive losses")

        intervention_log = V2GoldenInterventionLog(
            user_id=user_id,
            trigger_id="TRG_LOSE_5",
            trigger_condition=f"Last 5 game results: {','.join(last_5)}",
            action_taken="Trigger_Pity_Win",
            recent_results=",".join(last_5),
            cooldown_expires_at=datetime.utcnow() + timedelta(hours=cooldown_hours),
        )

        self.db.add(intervention_log)
        self.db.commit()
        self.db.refresh(intervention_log)

        # Update retention state
        self._update_intervention_timestamp(user_id)

        return intervention_log

    def check_balance_drop_trigger(
        self,
        user_id: int,
        session_start_balance: float,
        current_balance: float,
        drop_threshold: float = 0.5,
        cooldown_hours: int = 1,
    ) -> Optional[V2GoldenInterventionLog]:
        """
        Check for 50% balance drop trigger.

        Args:
            user_id: The user ID
            session_start_balance: Balance at session start
            current_balance: Current balance
            drop_threshold: Threshold for balance drop (default 0.5 = 50%)
            cooldown_hours: Cooldown period in hours

        Returns:
            Intervention log if triggered, None if not triggered or on cooldown
        """
        if session_start_balance <= 0:
            return None

        balance_delta = current_balance - session_start_balance
        drop_ratio = abs(balance_delta) / session_start_balance

        if drop_ratio < drop_threshold:
            return None

        # Check cooldown
        if self._is_on_cooldown(user_id, "TRG_BAL_DROP_50", cooldown_hours):
            logger.info(f"TRG_BAL_DROP_50 on cooldown for user {user_id}")
            return None

        # Trigger intervention
        logger.warning(
            f"TRG_BAL_DROP_50 triggered for user {user_id}: "
            f"balance dropped {drop_ratio:.1%} "
            f"({session_start_balance:.0f} -> {current_balance:.0f})"
        )

        intervention_log = V2GoldenInterventionLog(
            user_id=user_id,
            trigger_id="TRG_BAL_DROP_50",
            trigger_condition=f"Balance dropped {drop_ratio:.1%} (threshold: {drop_threshold:.0%})",
            action_taken="Crisis_Intervention",
            user_balance_before=session_start_balance,
            session_balance_delta=balance_delta,
            cooldown_expires_at=datetime.utcnow() + timedelta(hours=cooldown_hours),
        )

        self.db.add(intervention_log)
        self.db.commit()
        self.db.refresh(intervention_log)

        # Update retention state
        self._update_intervention_timestamp(user_id)
        self._update_session_delta(user_id, balance_delta)

        return intervention_log

    def _is_on_cooldown(self, user_id: int, trigger_id: str, cooldown_hours: int) -> bool:
        """Check if trigger is on cooldown for this user."""
        cutoff_time = datetime.utcnow() - timedelta(hours=cooldown_hours)

        last_intervention = (
            self.db.query(V2GoldenInterventionLog)
            .filter(
                and_(
                    V2GoldenInterventionLog.user_id == user_id,
                    V2GoldenInterventionLog.trigger_id == trigger_id,
                    V2GoldenInterventionLog.created_at > cutoff_time,
                )
            )
            .order_by(desc(V2GoldenInterventionLog.created_at))
            .first()
        )

        return last_intervention is not None

    def _update_intervention_timestamp(self, user_id: int) -> None:
        """Update last_intervention_at in retention state."""
        retention_state = self.db.query(V2UserRetentionState).filter_by(user_id=user_id).first()

        if retention_state:
            retention_state.last_intervention_at = datetime.utcnow()
            self.db.commit()

    def _update_session_delta(self, user_id: int, balance_delta: float) -> None:
        """Update session_balance_delta in retention state."""
        retention_state = self.db.query(V2UserRetentionState).filter_by(user_id=user_id).first()

        if retention_state:
            retention_state.session_balance_delta = balance_delta
            self.db.commit()

    def get_recent_interventions(
        self,
        user_id: int,
        limit: int = 10,
    ) -> list[V2GoldenInterventionLog]:
        """Get recent interventions for a user."""
        return (
            self.db.query(V2GoldenInterventionLog)
            .filter_by(user_id=user_id)
            .order_by(desc(V2GoldenInterventionLog.created_at))
            .limit(limit)
            .all()
        )
