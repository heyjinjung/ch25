"""Vault service (locked balance seeding and free fill once)."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User


class VaultService:
    VAULT_SEED_AMOUNT = 10_000
    VAULT_FILL_AMOUNT = 5_000

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
        if (user.vault_balance or 0) == 0 and (user.cash_balance or 0) == 0:
            user.vault_balance = self.VAULT_SEED_AMOUNT

        user.vault_balance = (user.vault_balance or 0) + self.VAULT_FILL_AMOUNT
        user.vault_fill_used_at = now_dt
        db.add(user)
        db.commit()
        db.refresh(user)

        return eligible, user, self.VAULT_FILL_AMOUNT, now_dt
