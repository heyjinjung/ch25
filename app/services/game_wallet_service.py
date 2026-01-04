"""Game wallet service for per-feature tokens."""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError, NotEnoughTokensError
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.trial_token_bucket import TrialTokenBucket


class GameWalletService:
    def _get_or_create_wallet(self, db: Session, user_id: int, token_type: GameTokenType, *, auto_commit: bool = True) -> UserGameWallet:
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

    def _log_ledger(self, db: Session, user_id: int, token_type: GameTokenType, delta: int, balance_after: int, reason: str | None = None, label: str | None = None, meta: dict | None = None, auto_commit: bool = True) -> None:
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

    def get_balance(self, db: Session, user_id: int, token_type: GameTokenType) -> int:
        wallet = self._get_or_create_wallet(db, user_id, token_type, auto_commit=True)
        return wallet.balance

    def _get_or_create_trial_bucket(self, db: Session, user_id: int, token_type: GameTokenType) -> TrialTokenBucket:
        bucket = (
            db.query(TrialTokenBucket)
            .filter(TrialTokenBucket.user_id == user_id, TrialTokenBucket.token_type == token_type)
            .one_or_none()
        )
        if bucket is None:
            bucket = TrialTokenBucket(user_id=user_id, token_type=token_type, balance=0)
            db.add(bucket)
            db.commit()
            db.refresh(bucket)
        return bucket

    def mark_trial_grant(self, db: Session, user_id: int, token_type: GameTokenType, amount: int) -> int:
        """Increment trial bucket balance.

        This should be called only when a TRIAL_GRANT was actually written to the wallet.
        Returns the updated trial-bucket balance.
        """

        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")
        bucket = self._get_or_create_trial_bucket(db, user_id, token_type)
        bucket.balance += amount
        db.add(bucket)
        db.commit()
        db.refresh(bucket)
        return int(bucket.balance)

    def require_and_consume_token(self, db: Session, user_id: int, token_type: GameTokenType, amount: int = 1, reason: str | None = None, label: str | None = None, meta: dict | None = None, auto_commit: bool = True) -> tuple[int, bool]:
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")

        settings = get_settings()
        wallet = self._get_or_create_wallet(db, user_id, token_type, auto_commit=auto_commit)

        # In test mode, auto-top-up to avoid blocking tests/demos.
        if settings.test_mode and wallet.balance < amount:
            wallet.balance = max(wallet.balance, amount)
            db.add(wallet)
            # Warning: This internal commit might be unavoidable or needs check too, 
            # but currently it's for test mode only.
            if auto_commit:
                db.commit()
                db.refresh(wallet)

        if wallet.balance < amount:
            raise NotEnoughTokensError("NOT_ENOUGH_TOKENS")

        # Determine whether this consumption used any trial-origin tokens.
        # We treat it as trial consumption if we can decrement from the trial bucket.
        consumed_trial_count = 0
        try:
            bucket = self._get_or_create_trial_bucket(db, user_id, token_type)
            if bucket.balance > 0:
                consumed_trial_count = min(int(bucket.balance), int(amount))
                bucket.balance = max(int(bucket.balance) - consumed_trial_count, 0)
                db.add(bucket)
        except Exception:
            # Fail-open: consuming tokens must not be blocked by trial bookkeeping.
            consumed_trial_count = 0

        wallet.balance -= amount
        db.add(wallet)
        if auto_commit:
            db.commit()
            db.refresh(wallet)
        # If not auto_commit, we don't refresh because refresh needs flush/commit usually if driven by DB logic? 
        # Actually refresh works if flushed. But simpler to skip refresh if not committing 
        # unless caller needs fresh state from triggers. Using wallet object is fine.
        
        ledger_meta = dict(meta or {})
        ledger_meta["consumed_trial"] = bool(consumed_trial_count > 0)
        self._log_ledger(db, user_id=user_id, token_type=token_type, delta=-amount, balance_after=wallet.balance, reason=reason or "CONSUME", label=label, meta=ledger_meta, auto_commit=auto_commit)
        return wallet.balance, bool(consumed_trial_count > 0)

    def grant_tokens(self, db: Session, user_id: int, token_type: GameTokenType, amount: int, reason: str | None = None, label: str | None = None, meta: dict | None = None, auto_commit: bool = True) -> int:
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")
        wallet = self._get_or_create_wallet(db, user_id, token_type, auto_commit=auto_commit)
        wallet.balance += amount
        db.add(wallet)
        if auto_commit:
            db.commit()
            db.refresh(wallet)
        self._log_ledger(db, user_id=user_id, token_type=token_type, delta=amount, balance_after=wallet.balance, reason=reason or "GRANT", label=label, meta=meta, auto_commit=auto_commit)
        return wallet.balance

    def revoke_tokens(self, db: Session, user_id: int, token_type: GameTokenType, amount: int, reason: str | None = None, label: str | None = None, meta: dict | None = None, auto_commit: bool = True) -> int:
        """Admin-only token revocation; prevents negative balance."""
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")
        wallet = self._get_or_create_wallet(db, user_id, token_type, auto_commit=auto_commit)
        if wallet.balance < amount:
            raise NotEnoughTokensError("NOT_ENOUGH_TOKENS")
        wallet.balance -= amount
        db.add(wallet)
        if auto_commit:
            db.commit()
            db.refresh(wallet)
        self._log_ledger(db, user_id=user_id, token_type=token_type, delta=-amount, balance_after=wallet.balance, reason=reason or "REVOKE", label=label, meta=meta, auto_commit=auto_commit)
        return wallet.balance
