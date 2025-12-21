"""Service for idempotent trial ticket grants to remove ticket-zero lockout."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.services.game_wallet_service import GameWalletService


class TrialGrantService:
    def __init__(self) -> None:
        self.wallet_service = GameWalletService()

    def grant_daily_if_empty(self, db: Session, user_id: int, token_type: GameTokenType) -> tuple[int, int, str | None]:
        """Grant 1 token if balance is 0 and not already granted today.

        Returns: (granted_amount, balance_after, grant_label)
        """

        balance = self.wallet_service.get_balance(db, user_id, token_type)
        if balance > 0:
            return 0, balance, None

        today_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()
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
        return 1, balance_after, label
