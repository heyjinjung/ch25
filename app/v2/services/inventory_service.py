"""V2 inventory service (exchange log + wallet/inventory ops)."""
from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, select

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError, NotEnoughTokensError
from app.v2.models import GameTokenType, UserGameWallet, UserGameWalletLedger
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.models.trial_token_bucket import TrialTokenBucket
from app.v2.services.idempotency_service import IdempotencyService
from app.v2.models.v2_exchange_log import V2ExchangeLog
from app.v2.services.user_service import V2UserService


class V2InventoryService:
    @staticmethod
    def _resolve_storage_user_id(db: Session, v2_user_id: int) -> int:
        return v2_user_id

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
    def _get_or_create_trial_bucket(
        db: Session,
        user_id: int,
        token_type: GameTokenType,
        *,
        auto_commit: bool = True,
    ) -> TrialTokenBucket:
        bucket = (
            db.query(TrialTokenBucket)
            .filter(TrialTokenBucket.user_id == user_id, TrialTokenBucket.token_type == token_type)
            .one_or_none()
        )
        if bucket is None:
            bucket = TrialTokenBucket(user_id=user_id, token_type=token_type, balance=0)
            db.add(bucket)
            if auto_commit:
                db.commit()
                db.refresh(bucket)
            else:
                db.flush()
        return bucket

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
    def get_wallet_balance(cls, db: Session, v2_user_id: int, token_type: GameTokenType | str) -> int:
        if isinstance(token_type, str):
            token_type = GameTokenType(token_type)
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        wallet = cls._get_or_create_wallet(db, storage_user_id, token_type, auto_commit=True)
        return int(wallet.balance or 0)

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

        # === Circuit Breaker: Safety Check ===
        from app.v2.services.circuit_breaker_service import CircuitBreakerService
        CircuitBreakerService.check_and_incr(db, token_type, amount, v2_user_id)

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
    def require_and_consume_wallet_token(
        cls,
        db: Session,
        v2_user_id: int,
        token_type: GameTokenType | str,
        amount: int = 1,
        *,
        reason: str | None = None,
        label: str | None = None,
        meta: dict | None = None,
        auto_commit: bool = True,
    ) -> tuple[int, bool]:
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")
        if isinstance(token_type, str):
            token_type = GameTokenType(token_type)

        settings = get_settings()
        storage_user_id = cls._resolve_storage_user_id(db, v2_user_id)
        wallet = cls._get_or_create_wallet(db, storage_user_id, token_type, auto_commit=auto_commit)

        if getattr(settings, "test_mode", False) and wallet.balance < amount:
            wallet.balance = max(wallet.balance, amount)
            db.add(wallet)
            if auto_commit:
                db.commit()
                db.refresh(wallet)
            else:
                db.flush()

        if int(wallet.balance or 0) < int(amount):
            raise NotEnoughTokensError("NOT_ENOUGH_TOKENS")

        consumed_trial_count = 0
        try:
            bucket = cls._get_or_create_trial_bucket(db, storage_user_id, token_type, auto_commit=auto_commit)
            if int(bucket.balance or 0) > 0:
                consumed_trial_count = min(int(bucket.balance), int(amount))
                bucket.balance = max(int(bucket.balance) - consumed_trial_count, 0)
                db.add(bucket)
        except Exception:
            consumed_trial_count = 0

        wallet.balance -= int(amount)
        db.add(wallet)
        if auto_commit:
            db.commit()
            db.refresh(wallet)
        else:
            db.flush()

        ledger_meta = dict(meta or {})
        ledger_meta["consumed_trial"] = bool(consumed_trial_count > 0)
        cls._log_wallet_ledger(
            db,
            user_id=storage_user_id,
            token_type=token_type,
            delta=-int(amount),
            balance_after=int(wallet.balance),
            reason=reason or "CONSUME",
            label=label,
            meta=ledger_meta,
            auto_commit=auto_commit,
        )
        return int(wallet.balance), bool(consumed_trial_count > 0)

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
        legacy_user_id: int | None = None,
        *,
        auto_commit: bool = True,
        skip_suspension_check: bool = False,
    ) -> dict:
        """바우처 사용 (티켓으로 교환).
        
        SoT: v2_strict_vault_policy_sot_ko.md
        - benefits_suspended=True인 유저는 바우처 사용 차단 (403)
        
        Args:
            skip_suspension_check: 관리자 강제 사용 시 True (기본 False)
        
        Raises:
            HTTPException(403): 7일 무입금 유저의 바우처 사용 시도
        """
        # === Strict Vault Policy: benefits_suspended 체크 ===
        if not skip_suspension_check:
            from app.v2.services.vault_service import V2VaultService
            is_suspended, deposit_7d = V2VaultService.is_benefits_suspended(db, v2_user_id)
            if is_suspended:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"[INVENTORY] Voucher use blocked: user_id={v2_user_id} benefits_suspended=True, "
                    f"deposit_7d={deposit_7d}, item_type={item_type}"
                )
                raise HTTPException(status_code=403, detail="BENEFITS_SUSPENDED")
        
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
            idem_user_id = legacy_user_id or v2_user_id
            idem_record, existing = IdempotencyService.begin(
                db,
                user_id=idem_user_id,
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
