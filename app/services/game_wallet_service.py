"""Game wallet service for per-feature tokens."""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError, NotEnoughTokensError
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger


class GameWalletService:
    def _get_or_create_wallet(self, db: Session, user_id: int, token_type: GameTokenType) -> UserGameWallet:
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == user_id, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=user_id, token_type=token_type, balance=0)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        return wallet

    def _log_ledger(self, db: Session, user_id: int, token_type: GameTokenType, delta: int, balance_after: int, reason: str | None = None, label: str | None = None, meta: dict | None = None) -> None:
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
        db.commit()

    def get_balance(self, db: Session, user_id: int, token_type: GameTokenType) -> int:
        wallet = self._get_or_create_wallet(db, user_id, token_type)
        return wallet.balance

    def require_and_consume_token(self, db: Session, user_id: int, token_type: GameTokenType, amount: int = 1, reason: str | None = None, label: str | None = None, meta: dict | None = None) -> int:
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")

        settings = get_settings()
        wallet = self._get_or_create_wallet(db, user_id, token_type)

        # In test mode, auto-top-up to avoid blocking tests/demos.
        if settings.test_mode and wallet.balance < amount:
            wallet.balance = max(wallet.balance, amount)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        if wallet.balance < amount:
            raise NotEnoughTokensError("NOT_ENOUGH_TOKENS")

        wallet.balance -= amount
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        self._log_ledger(db, user_id=user_id, token_type=token_type, delta=-amount, balance_after=wallet.balance, reason=reason or "CONSUME", label=label, meta=meta)
        return wallet.balance

    def grant_tokens(self, db: Session, user_id: int, token_type: GameTokenType, amount: int, reason: str | None = None, label: str | None = None, meta: dict | None = None) -> int:
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")
        wallet = self._get_or_create_wallet(db, user_id, token_type)
        wallet.balance += amount
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        self._log_ledger(db, user_id=user_id, token_type=token_type, delta=amount, balance_after=wallet.balance, reason=reason or "GRANT", label=label, meta=meta)
        return wallet.balance

    def revoke_tokens(self, db: Session, user_id: int, token_type: GameTokenType, amount: int, reason: str | None = None, label: str | None = None, meta: dict | None = None) -> int:
        """Admin-only token revocation; prevents negative balance."""
        if amount <= 0:
            raise InvalidConfigError("INVALID_TOKEN_AMOUNT")
        wallet = self._get_or_create_wallet(db, user_id, token_type)
        if wallet.balance < amount:
            raise NotEnoughTokensError("NOT_ENOUGH_TOKENS")
        wallet.balance -= amount
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        self._log_ledger(db, user_id=user_id, token_type=token_type, delta=-amount, balance_after=wallet.balance, reason=reason or "REVOKE", label=label, meta=meta)
        return wallet.balance
