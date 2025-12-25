"""Service for idempotent trial ticket grants to remove ticket-zero lockout."""

from __future__ import annotations

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

    def grant_daily_if_empty(self, db: Session, user_id: int, token_type: GameTokenType) -> tuple[int, int, str | None]:
        """Grant 1 token if balance is 0 and not already granted today.

        Returns: (granted_amount, balance_after, grant_label)
        """

        if not bool(getattr(self.settings, "enable_trial_grant_auto", True)):
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, None

        balance = self.wallet_service.get_balance(db, user_id, token_type)
        if balance > 0:
            return 0, balance, None

        today_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()

        # Weekly cap (0 = unlimited)
        weekly_cap = int(getattr(self.settings, "trial_weekly_cap", 0) or 0)
        if weekly_cap > 0:
            week_start = self._kst_week_start(today_kst)
            start_utc, _ = self._kst_day_bounds_utc(week_start)
            now_utc = datetime.utcnow()
            granted_this_week = self._sum_grants_in_window(
                db,
                user_id=user_id,
                token_type=token_type,
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

        start_utc, end_utc = self._kst_day_bounds_utc(today_kst)
        granted_today = self._sum_grants_in_window(
            db,
            user_id=user_id,
            token_type=token_type,
            start_utc=start_utc,
            end_utc=end_utc,
        )
        if granted_today >= daily_cap:
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, None

        label = f"TRIAL_{token_type.value}_{today_kst.isoformat()}"

        already = db.execute(
            select(UserGameWalletLedger.id).where(
                UserGameWalletLedger.user_id == user_id,
                UserGameWalletLedger.token_type == token_type,
                UserGameWalletLedger.delta > 0,
                UserGameWalletLedger.label == label,
            )
        ).first()
        if already is not None:
            balance_now = self.wallet_service.get_balance(db, user_id, token_type)
            return 0, balance_now, label

        balance_after = self.wallet_service.grant_tokens(
            db,
            user_id=user_id,
            token_type=token_type,
            amount=1,
            reason="TRIAL_GRANT",
            label=label,
            meta={"source": "ticket_zero", "date": today_kst.isoformat()},
        )
        try:
            self.wallet_service.mark_trial_grant(db, user_id=user_id, token_type=token_type, amount=1)
        except Exception:
            # Keep grant resilient; bucket is best-effort bookkeeping.
            pass
        return 1, balance_after, label
