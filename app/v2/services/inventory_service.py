"""V2 inventory service (exchange log + wallet/inventory ops)."""
from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, select

from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.services.idempotency_service import IdempotencyService
from app.v2.models.v2_exchange_log import V2ExchangeLog
from app.v2.services.user_service import V2UserService


class V2InventoryService:
    @staticmethod
    def _resolve_storage_user_id(db: Session, v2_user_id: int) -> int:
        return V2UserService.ensure_legacy_user_id(db, v2_user_id)

    @staticmethod
    def _get_or_create_wallet(
        db: Session,
        user_id: int,
        token_type: GameTokenType,
        *,
        auto_commit: bool = True,
    ) -> UserGameWallet:
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == user_id, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=user_id, token_type=token_type, balance=0)
            db.add(wallet)
            if auto_commit:
                db.commit()
                db.refresh(wallet)
            else:
                db.flush()
        return wallet

    @staticmethod
    def _log_wallet_ledger(
        db: Session,
        *,
        user_id: int,
        token_type: GameTokenType,
        delta: int,
        balance_after: int,
        reason: str | None = None,
        label: str | None = None,
        meta: dict | None = None,
        auto_commit: bool = True,
    ) -> None:
        entry = UserGameWalletLedger(
            user_id=user_id,
            token_type=token_type,
            delta=delta,
            balance_after=balance_after,
            reason=reason,
            label=label,
            meta_json=meta or {},
        )
        db.add(entry)
        if auto_commit:
            db.commit()

    @classmethod
    def get_wallet_balances(cls, db: Session, v2_user_id: int) -> dict[str, int]:
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        rows = db.query(UserGameWallet).filter(UserGameWallet.user_id == storage_user_id).all()
        result: dict[str, int] = {}
        for row in rows:
            result[str(row.token_type.value)] = int(row.balance or 0)
        return result

    @classmethod
    def grant_wallet_tokens(
        cls,
        db: Session,
        v2_user_id: int,
        token_type: GameTokenType,
        amount: int,
        *,
        reason: str | None = None,
        label: str | None = None,
        meta: dict | None = None,
        auto_commit: bool = True,
    ) -> int:
        if amount <= 0:
            raise ValueError("INVALID_TOKEN_AMOUNT")
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        wallet = cls._get_or_create_wallet(db, storage_user_id, token_type, auto_commit=auto_commit)
        wallet.balance += int(amount)
        db.add(wallet)
        if auto_commit:
            db.commit()
            db.refresh(wallet)
        cls._log_wallet_ledger(
            db,
            user_id=storage_user_id,
            token_type=token_type,
            delta=int(amount),
            balance_after=wallet.balance,
            reason=reason or "GRANT",
            label=label,
            meta=meta,
            auto_commit=auto_commit,
        )
        return int(wallet.balance)

    @classmethod
    def consume_wallet_tokens(
        cls,
        db: Session,
        v2_user_id: int,
        token_type: GameTokenType,
        amount: int,
        *,
        reason: str | None = None,
        label: str | None = None,
        meta: dict | None = None,
        auto_commit: bool = True,
    ) -> int:
        if amount <= 0:
            raise ValueError("INVALID_TOKEN_AMOUNT")
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        wallet = cls._get_or_create_wallet(db, storage_user_id, token_type, auto_commit=auto_commit)
        if int(wallet.balance or 0) < int(amount):
            raise ValueError("INSUFFICIENT_BALANCE")
        wallet.balance -= int(amount)
        db.add(wallet)
        if auto_commit:
            db.commit()
            db.refresh(wallet)
        cls._log_wallet_ledger(
            db,
            user_id=storage_user_id,
            token_type=token_type,
            delta=-int(amount),
            balance_after=wallet.balance,
            reason=reason or "CONSUME",
            label=label,
            meta=meta,
            auto_commit=auto_commit,
        )
        return int(wallet.balance)

    @classmethod
    def get_inventory(cls, db: Session, v2_user_id: int) -> list[UserInventoryItem]:
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        return db.scalars(
            select(UserInventoryItem).where(UserInventoryItem.user_id == storage_user_id)
        ).all()

    @classmethod
    def grant_item(
        cls,
        db: Session,
        v2_user_id: int,
        item_type: str,
        amount: int,
        reason: str,
        related_id: str | None = None,
        *,
        auto_commit: bool = True,
    ) -> UserInventoryItem:
        if amount <= 0:
            raise ValueError("Amount must be positive")
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        item = db.scalar(
            select(UserInventoryItem).where(
                and_(UserInventoryItem.user_id == storage_user_id, UserInventoryItem.item_type == item_type)
            )
        )
        if not item:
            item = UserInventoryItem(user_id=storage_user_id, item_type=item_type, quantity=0)
            db.add(item)
            db.flush()
        item.quantity += int(amount)

        ledger = UserInventoryLedger(
            user_id=storage_user_id,
            item_type=item_type,
            change_amount=int(amount),
            balance_after=item.quantity,
            reason=reason,
            related_id=related_id,
        )
        db.add(ledger)
        if auto_commit:
            db.commit()
            db.refresh(item)
        return item

    @classmethod
    def consume_item(
        cls,
        db: Session,
        v2_user_id: int,
        item_type: str,
        amount: int,
        reason: str,
        related_id: str | None = None,
        *,
        auto_commit: bool = True,
    ) -> UserInventoryItem:
        if amount <= 0:
            raise ValueError("Amount must be positive")
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        item = db.scalar(
            select(UserInventoryItem)
            .where(
                and_(UserInventoryItem.user_id == storage_user_id, UserInventoryItem.item_type == item_type)
            )
            .with_for_update()
        )
        if not item or item.quantity < amount:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_ITEM_QUANTITY")
        item.quantity -= int(amount)

        ledger = UserInventoryLedger(
            user_id=storage_user_id,
            item_type=item_type,
            change_amount=-int(amount),
            balance_after=item.quantity,
            reason=reason,
            related_id=related_id,
        )
        db.add(ledger)
        if auto_commit:
            db.commit()
            db.refresh(item)
        return item

    @staticmethod
    def log_exchange(
        db: Session,
        *,
        user_id: int,
        input_type: str,
        input_amount: int,
        output_type: str,
        output_amount: int,
    ) -> V2ExchangeLog:
        if input_amount <= 0:
            raise ValueError("input_amount must be > 0")
        if output_amount <= 0:
            raise ValueError("output_amount must be > 0")

        record = V2ExchangeLog(
            user_id=user_id,
            input_type=input_type,
            input_amount=input_amount,
            output_type=output_type,
            output_amount=output_amount,
        )
        db.add(record)
        db.flush()
        return record

    @classmethod
    def use_voucher(
        cls,
        db: Session,
        v2_user_id: int,
        item_type: str,
        amount: int,
        idempotency_key: str | None = None,
        *,
        auto_commit: bool = True,
    ) -> dict:
        REWARD_MAP = {
            "VOUCHER_GOLD_KEY_1": {"token": GameTokenType.GOLD_KEY_TICKET, "amount": 1},
            "VOUCHER_DIAMOND_KEY_1": {"token": GameTokenType.DIAMOND_TICKET, "amount": 1},
            "VOUCHER_ROULETTE_COIN_1": {"token": GameTokenType.ROULETTE_TICKET, "amount": 1},
            "VOUCHER_DICE_TOKEN_1": {"token": GameTokenType.DICE_TICKET, "amount": 1},
            "VOUCHER_LOTTERY_TICKET_1": {"token": GameTokenType.LOTTERY_TICKET, "amount": 1},
        }
        reward = REWARD_MAP.get(item_type)
        if not reward:
            raise HTTPException(status_code=400, detail="INVALID_VOUCHER_TYPE")

        total_reward_amount = int(reward["amount"]) * int(amount)
        token_type = reward["token"]

        request_payload = {"item_type": item_type, "amount": amount}
        idem_record = None
        if auto_commit and idempotency_key:
            idem_record, existing = IdempotencyService.begin(
                db,
                user_id=v2_user_id,
                scope="v2_inventory_use",
                idempotency_key=idempotency_key,
                request_payload=request_payload,
            )
            if existing is not None:
                return existing

        def _apply_use() -> dict:
            cls.consume_item(db, v2_user_id, item_type, amount, reason="USE_VOUCHER", auto_commit=False)
            cls.grant_wallet_tokens(
                db,
                v2_user_id,
                token_type,
                total_reward_amount,
                reason=f"V2_VOUCHER_USE:{item_type}",
                auto_commit=False,
            )
            return {
                "success": True,
                "used_item": item_type,
                "used_amount": int(amount),
                "reward_token": token_type.value,
                "reward_amount": int(total_reward_amount),
            }

        if not auto_commit:
            return _apply_use()

        try:
            response = _apply_use()
            if idem_record is not None:
                IdempotencyService.complete(db, record=idem_record, response_payload=response)
            db.commit()
            return response
        except Exception:
            db.rollback()
            raise
