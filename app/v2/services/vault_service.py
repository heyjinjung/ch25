"""V2 vault service.

SoT: `User.vault_locked_balance`

운영 DB는 V2 전용 `v2_user` 테이블이 항상 존재/동기화되어 있지 않으므로,
관리자 조정/집계 등은 `user` 테이블의 `vault_locked_balance`를 기준으로 처리한다.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class V2VaultService:
    @staticmethod
    def get_locked_balance(db: Session, user_id: int) -> int:
        balance = db.execute(
            select(User.vault_locked_balance).where(User.id == user_id)
        ).scalar_one_or_none()
        if balance is None:
            raise ValueError("user not found")
        return int(balance)

    @staticmethod
    def deposit(db: Session, user_id: int, amount: int) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")
        user = db.get(User, user_id)
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
        user = db.get(User, user_id)
        if user is None:
            raise ValueError("user not found")
        current = int(user.vault_locked_balance or 0)
        if current < amount:
            raise ValueError("insufficient locked balance")
        user.vault_locked_balance = current - amount
        db.add(user)
        db.flush()
        return int(user.vault_locked_balance)
