"""Service for idempotent trial ticket grants to remove ticket-zero lockout."""

from __future__ import annotations

import random
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.services.game_wallet_service import GameWalletService


class TrialGrantService:
    def __init__(self) -> None:
        self.wallet_service = GameWalletService()
        self.settings = get_settings()

        # TRIAL_GRANT is meant to prevent "ticket-zero" lockout only.
        # Premium keys must never be auto-granted via trial.
        self._allowed_trial_token_types: set[GameTokenType] = {
            GameTokenType.ROULETTE_COIN,
            GameTokenType.DICE_TOKEN,
            GameTokenType.LOTTERY_TICKET,
            GameTokenType.TRIAL_TOKEN,
        }

        # Per-user daily total cap across all trial-grantable token types.
        # (Even if more token types become trial-grantable later, keep a strict global limit.)
        self._daily_total_cap: int = 3

    @staticmethod
    def _kst_day_bounds_utc(day_kst) -> tuple[datetime, datetime]:
        tz_kst = ZoneInfo("Asia/Seoul")
        start_kst = datetime.combine(day_kst, time.min, tzinfo=tz_kst)
        end_kst = start_kst + timedelta(days=1)
        return (
            start_kst.astimezone(timezone.utc).replace(tzinfo=None),
            end_kst.astimezone(timezone.utc).replace(tzinfo=None),
        )

    @staticmethod
    def _kst_week_start(day_kst):
        # Monday-based week start.
        return day_kst - timedelta(days=int(day_kst.weekday()))

    def _sum_grants_in_window(
        self,
        db: Session,
        *,
        user_id: int,
        token_type: GameTokenType,
        start_utc: datetime,
        end_utc: datetime,
    ) -> int:
        total = db.execute(
            select(func.coalesce(func.sum(UserGameWalletLedger.delta), 0)).where(
                UserGameWalletLedger.user_id == user_id,
                UserGameWalletLedger.token_type == token_type,
                UserGameWalletLedger.delta > 0,
                UserGameWalletLedger.reason == "TRIAL_GRANT",
                UserGameWalletLedger.created_at >= start_utc,
                UserGameWalletLedger.created_at < end_utc,
            )
        ).scalar_one()
        return int(total or 0)

    def _sum_total_grants_in_window(
        self,
        db: Session,
        *,
        user_id: int,
        token_types: set[GameTokenType],
        start_utc: datetime,
        end_utc: datetime,
    ) -> int:
        total = db.execute(
            select(func.coalesce(func.sum(UserGameWalletLedger.delta), 0)).where(
                UserGameWalletLedger.user_id == user_id,
                UserGameWalletLedger.token_type.in_(token_types),
                UserGameWalletLedger.delta > 0,
                UserGameWalletLedger.reason == "TRIAL_GRANT",
                UserGameWalletLedger.created_at >= start_utc,
                UserGameWalletLedger.created_at < end_utc,
            )
        ).scalar_one()
        return int(total or 0)

    def _has_any_trial_grant(self, db: Session, *, user_id: int, token_type: GameTokenType) -> bool:
        row = db.execute(
            select(UserGameWalletLedger.id).where(
                UserGameWalletLedger.user_id == user_id,
                UserGameWalletLedger.token_type == token_type,
                UserGameWalletLedger.delta > 0,
                UserGameWalletLedger.reason == "TRIAL_GRANT",
            )
        ).first()
        return row is not None

    def _should_grant_after_first(self, db: Session, *, user_id: int, token_type: GameTokenType) -> bool:
        """Return True if we should proceed with a trial grant for non-first-time users.

        Default is always-true (legacy behavior). Can be tuned via env vars:
        - TRIAL_GRANT_PROB_AFTER_FIRST: float in [0, 1]
        - TRIAL_GRANT_FIRST_TIME_GUARANTEE: bool
        """

        has_any = self._has_any_trial_grant(db, user_id=user_id, token_type=token_type)
        if not has_any and bool(getattr(self.settings, "trial_grant_first_time_guarantee", True)):
            return True

        raw_prob = getattr(self.settings, "trial_grant_prob_after_first", 1.0)
        prob = 1.0 if raw_prob is None else float(raw_prob)
        prob = max(0.0, min(1.0, prob))
        return random.random() < prob

    def grant_daily_if_empty(self, db: Session, user_id: int, token_type: GameTokenType) -> tuple[int, int, str | None]:
        """Grant 1 token if balance is 0 and not already granted today.

        Returns: (granted_amount, balance_after, grant_label)
        """

        # Hard safety gate: do not trial-grant anything except the 3 ticket token types.
        if token_type not in self._allowed_trial_token_types:
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, None

        if not bool(getattr(self.settings, "enable_trial_grant_auto", True)):
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, None

        balance = self.wallet_service.get_balance(db, user_id, token_type)
        if balance > 0:
            return 0, balance, None

        # [TRIAL TOKEN STRATEGY]
        # Redirect all real-ticket grants to TRIAL_TOKEN (Amount: 3)
        grant_token_type = token_type
        grant_amount = 1
        
        if token_type in {GameTokenType.ROULETTE_COIN, GameTokenType.DICE_TOKEN, GameTokenType.LOTTERY_TICKET}:
            grant_token_type = GameTokenType.TRIAL_TOKEN
            grant_amount = 3
            
            # Additional Check: If user already has TRIAL tokens, don't grant more.
            # Force them to consume existing trial tokens first.
            trial_balance = self.wallet_service.get_balance(db, user_id, grant_token_type)
            if trial_balance > 0:
                 return 0, trial_balance, None

        today_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()

        # Global daily total cap across all trial-grantable token types.
        # Note: We count successful TRIAL_GRANT ledger entries (delta > 0).
        start_utc, end_utc = self._kst_day_bounds_utc(today_kst)
        if self._daily_total_cap > 0:
            granted_total_today = self._sum_total_grants_in_window(
                db,
                user_id=user_id,
                token_types=self._allowed_trial_token_types,
                start_utc=start_utc,
                end_utc=end_utc,
            )
            if granted_total_today >= self._daily_total_cap:
                balance_now = self.wallet_service.get_balance(db, user_id, token_type)
                return 0, balance_now, None

        # Weekly cap (0 = unlimited)
        weekly_cap = int(getattr(self.settings, "trial_weekly_cap", 0) or 0)
        if weekly_cap > 0:
            week_start = self._kst_week_start(today_kst)
            start_utc, _ = self._kst_day_bounds_utc(week_start)
            now_utc = datetime.utcnow()
            granted_this_week = self._sum_grants_in_window(
                db,
                user_id=user_id,
                token_type=grant_token_type,
                start_utc=start_utc,
                end_utc=now_utc,
            )
            if granted_this_week >= weekly_cap:
                balance_now = self.wallet_service.get_balance(db, user_id, token_type)
                return 0, balance_now, None

        # Daily cap (default 1; legacy behavior was effectively 1/day)
        daily_cap = max(int(getattr(self.settings, "trial_daily_cap", 1) or 1), 0)
        if daily_cap == 0:
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, None

        # Per-token daily cap and idempotency checks.
        granted_today = self._sum_grants_in_window(
            db,
            user_id=user_id,
            token_type=grant_token_type,
            start_utc=start_utc,
            end_utc=end_utc,
        )
        if granted_today >= daily_cap:
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, None

        # Funnel-split policy: first-ever grant is guaranteed; subsequent grants can be probabilistic.
        if not self._should_grant_after_first(db, user_id=user_id, token_type=grant_token_type):
            balance_now = self.wallet_service.get_balance(db, user_id, grant_token_type)
            return 0, balance_now, None

        label = f"TRIAL_{grant_token_type.value}_{today_kst.isoformat()}"

        already = db.execute(
            select(UserGameWalletLedger.id).where(
                UserGameWalletLedger.user_id == user_id,
                UserGameWalletLedger.token_type == grant_token_type,
                UserGameWalletLedger.delta > 0,
                UserGameWalletLedger.label == label,
            )
        ).first()
        if already is not None:
            balance_now = self.wallet_service.get_balance(db, user_id, grant_token_type)
            return 0, balance_now, label

        balance_after = self.wallet_service.grant_tokens(
            db,
            user_id=user_id,
            token_type=grant_token_type,
            amount=grant_amount,
            reason="TRIAL_GRANT",
            label=label,
            meta={"source": "ticket_zero", "date": today_kst.isoformat(), "requested_token": token_type.value},
        )
        try:
            self.wallet_service.mark_trial_grant(db, user_id=user_id, token_type=grant_token_type, amount=grant_amount)
        except Exception:
            # Keep grant resilient; bucket is best-effort bookkeeping.
            pass
        return grant_amount, balance_after, label
