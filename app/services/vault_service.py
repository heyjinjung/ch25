"""Vault service (Phase 1: locked balance is the source of truth).

Phase 1 rules implemented here:
- All calculations use `user.vault_locked_balance`.
- `user.vault_balance` is a legacy read-only mirror kept in sync from locked.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.services.reward_service import RewardService
from app.services.vault2_service import Vault2Service


class VaultService:
    VAULT_SEED_AMOUNT = 10_000
    VAULT_FILL_AMOUNT = 5_000

    # Vault unlock tiers (Phase 1): determined by deposit increase delta.
    # Option A (10,000 charge): unlock 5,000 and keep remainder locked.
    # Option B (50,000 charge): unlock 10,000.
    VAULT_TIER_A_MIN_DELTA = 10_000
    VAULT_TIER_A_UNLOCK = 5_000
    VAULT_TIER_B_MIN_DELTA = 50_000
    VAULT_TIER_B_UNLOCK = 10_000

    @staticmethod
    def sync_legacy_mirror(user: User) -> None:
        # `vault_balance` is a legacy mirror for UI compatibility.
        user.vault_balance = int(user.vault_locked_balance or 0)

    @staticmethod
    def _is_eligible_row_active(row: NewMemberDiceEligibility | None, now: datetime) -> bool:
        if row is None:
            return False
        if not row.is_eligible:
            return False
        if row.revoked_at is not None:
            return False
        if row.expires_at is not None and row.expires_at <= now:
            return False
        return True

    def _get_or_create_user(self, db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        return user

    def _eligible(self, db: Session, user_id: int, now: datetime) -> bool:
        row = db.execute(select(NewMemberDiceEligibility).where(NewMemberDiceEligibility.user_id == user_id)).scalar_one_or_none()
        return self._is_eligible_row_active(row, now)

    def get_status(self, db: Session, user_id: int, now: datetime | None = None) -> tuple[bool, User, bool]:
        now_dt = now or datetime.utcnow()
        eligible = self._eligible(db, user_id, now_dt)
        user = self._get_or_create_user(db, user_id)

        # IMPORTANT UX POLICY:
        # Do not auto-seed on status fetch. The initial seed is granted on actual funnel events
        # (e.g., 신규회원 주사위 LOSE 시 보관, 또는 무료 fill 사용 시).
        return eligible, user, False

    def fill_free_once(self, db: Session, user_id: int, now: datetime | None = None) -> tuple[bool, User, int, datetime]:
        now_dt = now or datetime.utcnow()
        eligible = self._eligible(db, user_id, now_dt)
        if not eligible:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VAULT_NOT_ELIGIBLE")

        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        if user.vault_fill_used_at is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="VAULT_FILL_ALREADY_USED")

        # Ensure the initial seed exists for a first-time eligible user.
        if (user.vault_locked_balance or 0) == 0 and (user.cash_balance or 0) == 0:
            user.vault_locked_balance = self.VAULT_SEED_AMOUNT

        user.vault_locked_balance = (user.vault_locked_balance or 0) + self.VAULT_FILL_AMOUNT
        self.sync_legacy_mirror(user)
        user.vault_fill_used_at = now_dt
        db.add(user)
        db.commit()
        db.refresh(user)

        return eligible, user, self.VAULT_FILL_AMOUNT, now_dt

    def handle_deposit_increase_signal(
        self,
        db: Session,
        *,
        user_id: int,
        deposit_delta: int,
        prev_amount: int,
        new_amount: int,
        now: datetime | None = None,
        commit: bool = True,
    ) -> int:
        """Process external ranking "deposit increased" signal.

        Returns unlock_amount (cash granted) for observability.

        Phase 1 responsibility split:
        - External ranking service detects delta and calls this.
        - Unlock calculation and ledger/cash grant are centralized here.
        """

        now_dt = now or datetime.utcnow()
        if deposit_delta <= 0:
            return 0

        # Eligibility is required for Phase 1 vault funnel.
        if not self._eligible(db, user_id, now_dt):
            return 0

        unlock_target = 0
        tier = None
        if deposit_delta >= self.VAULT_TIER_B_MIN_DELTA:
            unlock_target = self.VAULT_TIER_B_UNLOCK
            tier = "B"
        elif deposit_delta >= self.VAULT_TIER_A_MIN_DELTA:
            unlock_target = self.VAULT_TIER_A_UNLOCK
            tier = "A"

        if unlock_target <= 0:
            return 0

        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)

        if user is None:
            return 0

        locked = int(user.vault_locked_balance or 0)
        if locked <= 0:
            return 0

        unlock_amount = min(locked, unlock_target)
        user.vault_locked_balance = max(locked - unlock_amount, 0)
        self.sync_legacy_mirror(user)
        db.add(user)

        RewardService().grant_point(
            db,
            user_id=user.id,
            amount=unlock_amount,
            reason="VAULT_UNLOCK",
            label="VAULT_UNLOCK",
            meta={
                "trigger": "EXTERNAL_RANKING_DEPOSIT_INCREASE",
                "tier": tier,
                "unlock_target": unlock_target,
                "unlock_amount": unlock_amount,
                "external_ranking_deposit_prev": prev_amount,
                "external_ranking_deposit_new": new_amount,
                "external_ranking_deposit_delta": deposit_delta,
            },
            commit=False,
        )

        # Phase 2/3-stage prep: record unlock event into Vault2 status (bookkeeping only).
        Vault2Service().record_unlock_event(
            db,
            user_id=user.id,
            unlock_amount=unlock_amount,
            trigger="EXTERNAL_RANKING_DEPOSIT_INCREASE",
            meta={
                "tier": tier,
                "unlock_target": unlock_target,
                "external_ranking_deposit_prev": prev_amount,
                "external_ranking_deposit_new": new_amount,
                "external_ranking_deposit_delta": deposit_delta,
            },
            now=now_dt,
            commit=False,
        )

        if commit:
            db.commit()
        else:
            db.flush()
        return unlock_amount
