"""V2 vault service (SoT: vault_locked_balance only)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.v2.models.user import V2User


class V2VaultService:
    @staticmethod
    def get_locked_balance(db: Session, user_id: int) -> int:
        balance = db.execute(
            select(V2User.vault_locked_balance).where(V2User.id == user_id)
        ).scalar_one_or_none()
        if balance is None:
            raise ValueError("user not found")
        return int(balance)

    @staticmethod
    def deposit(db: Session, user_id: int, amount: int) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")
        user = db.get(V2User, user_id)
        if user is None:
            raise ValueError("user not found")
        user.vault_locked_balance = int(user.vault_locked_balance or 0) + amount
        db.add(user)
        db.flush()
        return int(user.vault_locked_balance)

    @staticmethod
    def withdraw(db: Session, user_id: int, amount: int) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")
        user = db.get(V2User, user_id)
        if user is None:
            raise ValueError("user not found")
        current = int(user.vault_locked_balance or 0)
        if current < amount:
            raise ValueError("insufficient locked balance")
        user.vault_locked_balance = current - amount
        db.add(user)
        db.flush()
        return int(user.vault_locked_balance)
