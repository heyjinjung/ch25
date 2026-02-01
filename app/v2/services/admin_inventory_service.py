"""V2 admin-specific inventory and wallet management service."""
from __future__ import annotations
from typing import Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException
from app.v2.models import UserGameWallet, GameTokenType, UserGameWalletLedger
from app.v2.models import UserInventoryItem, UserInventoryLedger
from app.core.exceptions import NotEnoughTokensError

class V2AdminInventoryService:
    @staticmethod
    def grant_tokens(
        db: Session, 
        user_id: int, 
        token_type: object, 
        amount: int, 
        reason: str | None = None, 
        label: str | None = None, 
        auto_commit: bool = True
    ) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")
        if isinstance(token_type, str):
            token_type = GameTokenType(token_type)

        wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == user_id, 
            UserGameWallet.token_type == token_type
        ).with_for_update().first()

        if not wallet:
            wallet = UserGameWallet(user_id=user_id, token_type=token_type, balance=0)
            db.add(wallet)
            db.flush()

        wallet.balance += amount
        db.add(wallet)

        ledger = UserGameWalletLedger(
            user_id=user_id,
            token_type=token_type,
            delta=amount,
            balance_after=wallet.balance,
            reason=reason or "ADMIN_GRANT",
            label=label
        )
        db.add(ledger)

        if auto_commit:
            db.commit()
            db.refresh(wallet)
        else:
            db.flush()

        return int(wallet.balance)

    @staticmethod
    def revoke_tokens(
        db: Session, 
        user_id: int, 
        token_type: object, 
        amount: int, 
        reason: str | None = None, 
        label: str | None = None, 
        auto_commit: bool = True
    ) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")
        if isinstance(token_type, str):
            token_type = GameTokenType(token_type)

        wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == user_id, 
            UserGameWallet.token_type == token_type
        ).with_for_update().first()

        if not wallet or wallet.balance < amount:
            raise NotEnoughTokensError("insufficient tokens")

        wallet.balance -= amount
        db.add(wallet)

        ledger = UserGameWalletLedger(
            user_id=user_id,
            token_type=token_type,
            delta=-amount,
            balance_after=wallet.balance,
            reason=reason or "ADMIN_REVOKE",
            label=label
        )
        db.add(ledger)

        if auto_commit:
            db.commit()
            db.refresh(wallet)
        else:
            db.flush()

        return int(wallet.balance)

    @staticmethod
    def grant_item(
        db: Session, 
        user_id: int, 
        item_type: str, 
        amount: int, 
        reason: str, 
        related_id: str | None = None, 
        auto_commit: bool = True
    ) -> UserInventoryItem:
        if amount <= 0:
            raise ValueError("amount must be > 0")

        item = db.scalar(
            select(UserInventoryItem).where(
                and_(UserInventoryItem.user_id == user_id, UserInventoryItem.item_type == item_type)
            ).with_for_update()
        )

        if not item:
            item = UserInventoryItem(user_id=user_id, item_type=item_type, quantity=0)
            db.add(item)
            db.flush()

        item.quantity += amount
        db.add(item)

        ledger = UserInventoryLedger(
            user_id=user_id,
            item_type=item_type,
            change_amount=amount,
            balance_after=item.quantity,
            reason=reason or "ADMIN_GRANT",
            related_id=related_id
        )
        db.add(ledger)

        if auto_commit:
            db.commit()
            db.refresh(item)
        else:
            db.flush()

        return item

    @staticmethod
    def consume_item(
        db: Session, 
        user_id: int, 
        item_type: str, 
        amount: int, 
        reason: str, 
        related_id: str | None = None, 
        auto_commit: bool = True
    ) -> UserInventoryItem:
        if amount <= 0:
            raise ValueError("amount must be > 0")

        item = db.scalar(
            select(UserInventoryItem).where(
                and_(UserInventoryItem.user_id == user_id, UserInventoryItem.item_type == item_type)
            ).with_for_update()
        )

        if not item or item.quantity < amount:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_ITEM_QUANTITY")

        item.quantity -= amount
        db.add(item)

        ledger = UserInventoryLedger(
            user_id=user_id,
            item_type=item_type,
            change_amount=-amount,
            balance_after=item.quantity,
            reason=reason or "ADMIN_CONSUME",
            related_id=related_id
        )
        db.add(ledger)

        if auto_commit:
            db.commit()
            db.refresh(item)
        else:
            db.flush()

        return item

    @staticmethod
    def get_inventory(db: Session, user_id: int) -> list[UserInventoryItem]:
        return db.scalars(
            select(UserInventoryItem).where(UserInventoryItem.user_id == user_id)
        ).all()

    @staticmethod
    def get_balance(db: Session, user_id: int, token_type: object) -> int:
        if isinstance(token_type, str):
            token_type = GameTokenType(token_type)
        wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == user_id, 
            UserGameWallet.token_type == token_type
        ).first()
        return int(wallet.balance) if wallet else 0
