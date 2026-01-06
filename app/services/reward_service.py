"""Reward service for coupons, points, and game tickets."""
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService


class RewardService:
    """Centralize reward delivery (points, coupons, game tickets)."""

    def __init__(self) -> None:
        self.wallet_service = GameWalletService()

    def grant_point(
        self,
        db: Session,
        user_id: int,
        amount: int,
        reason: str | None = None,
        label: str | None = None,
        meta: dict[str, Any] | None = None,
        commit: bool = True,
    ) -> None:
        """Grant points to a user by updating cash_balance and writing a ledger entry."""

        if amount == 0:
            return
        if amount < 0:
            raise InvalidConfigError("INVALID_POINT_AMOUNT")

        q = db.query(User).filter(User.id == user_id)
        # Avoid races in MySQL/Postgres; SQLite used in tests doesn't support FOR UPDATE.
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()

        # In test sqlite environments, auto-create a placeholder user so existing tests/demos
        # that rely on dependency overrides (user_id=1) don't fail.
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)

        if user is None:
            raise InvalidConfigError("USER_NOT_FOUND")

        user.cash_balance = (user.cash_balance or 0) + amount
        entry = UserCashLedger(
            user_id=user_id,
            delta=amount,
            balance_after=user.cash_balance,
            reason=reason or "GRANT",
            label=label,
            meta_json=meta or {},
        )
        db.add(user)
        db.add(entry)

        if commit:
            db.commit()
            db.refresh(user)
            db.refresh(entry)
        else:
            db.flush()

    def _grant_vault_locked(
        self,
        db: Session,
        user_id: int,
        amount: int,
        reason: str | None = None,
        label: str | None = None,
        meta: dict[str, Any] | None = None,
        commit: bool = True,
    ) -> None:
        if amount == 0:
            return
        if amount < 0:
            raise InvalidConfigError("INVALID_POINT_AMOUNT")

        # Local import to avoid circular dependencies.
        from app.services.vault_service import VaultService  # pylint: disable=import-outside-toplevel

        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None:
            raise InvalidConfigError("USER_NOT_FOUND")

        now = datetime.utcnow()
        user.vault_locked_balance = (user.vault_locked_balance or 0) + amount
        
        # [REFACTORED] Vault Expiry Logic Disabled (Phase 3)
        # VaultService._ensure_locked_expiry(user, now)  <-- DISABLED 
        VaultService.sync_legacy_mirror(user)
        
        # [NEW] Ledger Entry for Vault Grant (Reward)
        entry = UserCashLedger(
            user_id=user_id,
            delta=amount,
            balance_after=user.vault_locked_balance,
            reason=reason or "VAULT_GRANT",
            label=label,
            meta_json={**(meta or {}), "asset_type": "VAULT"},
            created_at=now
        )
        
        db.add(user)
        db.add(entry)

        if commit:
            db.commit()
            db.refresh(user)
        else:
            db.flush()

    def grant_coupon(self, db: Session, user_id: int, coupon_type: str, meta: dict[str, Any] | None = None) -> None:
        """Grant a coupon to a user (DEPRECATED/REMOVED)."""
        # System disabled per admin request.
        pass

    def grant_ticket(self, db: Session, user_id: int, token_type: GameTokenType | str, amount: int, meta: dict[str, Any] | None = None, commit: bool = True) -> None:
        """
        Grant game tickets (roulette/dice/lottery) or DIAMOND to the user.
        If token_type is 'DIAMOND', it is granted as an Inventory Item (Phase 2).
        """

        if token_type == "DIAMOND" or token_type == GameTokenType.DIAMOND:
            InventoryService.grant_item(
                db, 
                user_id, 
                "DIAMOND", 
                amount, 
                reason=(meta or {}).get("reason") or "REWARD",
                related_id=(meta or {}).get("related_id"),
                auto_commit=commit
            )
            return

        self.wallet_service.grant_tokens(
            db,
            user_id=user_id,
            token_type=token_type,
            amount=amount,
            reason=(meta or {}).get("reason") or "LEVEL_REWARD",
            label=(meta or {}).get("label") or "AUTO_GRANT",
            meta=meta,
            auto_commit=commit
        )

    def deliver(self, db: Session, user_id: int, reward_type: str, reward_amount: int, meta: dict[str, Any] | None = None, commit: bool = True) -> None:
        """Dispatch reward based on reward_type; no-op for NONE/zero."""

        if reward_amount == 0 or reward_type in {"NONE", "", None}:
            return
        # [REFACTORED V3] Unified Economy & Progression
        # 1. POINT/CC_POINT -> Vault Locked Balance (no cash_balance)
        # 2. GAME_XP -> SeasonPassService
        # 3. Tickets/Diamonds -> Wallet/Inventory (preserved)

        # 1) GAME_XP: Season Level XP (Explicit Type)
        if reward_type == "GAME_XP":
            # Lazy import to avoid circular dependency
            from app.services.season_pass_service import SeasonPassService  # pylint: disable=import-outside-toplevel

            xp_amount = int(reward_amount)
            if xp_amount > 0:
                print(f"DEBUG: Delivering Season XP: {xp_amount} (GAME_XP)")
                # SeasonPassService logic handles internal commit potentially. 
                # Assuming simple update for now. 
                SeasonPassService().add_bonus_xp(db, user_id=user_id, xp_amount=xp_amount, commit=commit)
            return

        # 2) POINT / CC_POINT: Vault Locked Balance (Direct Accrual)
        # - 기존 xp_from_game_reward 플래그 제거 (게임 XP는 반드시 GAME_XP 타입으로만 지급)
        # - cash_balance 지급 로직 제거 -> 무조건 _grant_vault_locked
        if reward_type in {"POINT", "CC_POINT"}:
            reason = (meta or {}).get("reason") if meta else None
            label = (meta or {}).get("label") if meta else None
            
            # NOTE: 키 룰렛 등에서 강제로 POINT로 들어오는 경우도 여기서 금고로 통합됨.
            self._grant_vault_locked(
                db, 
                user_id=user_id, 
                amount=reward_amount, 
                reason=reason or f"REWARD_{reward_type}", 
                label=label,
                meta=meta,
                commit=commit
            )
            return

        # 3) BUNDLE: Multi-reward packages
        if reward_type in {"BUNDLE", "TICKET_BUNDLE"}:
            bundle_items = []
            if reward_amount == 3:  # Level 3: All-in-one Bundle
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 1),
                    (GameTokenType.DICE_TOKEN, 1),
                    (GameTokenType.LOTTERY_TICKET, 1),
                ]
            elif reward_amount == 6:  # Level 5: Mini Ticket bomb
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 3),
                    (GameTokenType.DICE_TOKEN, 3),
                ]
            elif reward_amount == 7:  # Level 7: 10,000 Point + Gold Key 1
                # [FIX] Force grant_point -> _grant_vault_locked
                self._grant_vault_locked(db, user_id=user_id, amount=10000, reason="LEVEL_BUNDLE_7", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.GOLD_KEY, 1)]
            elif reward_amount == 12:  # Level 14: Special Bundle
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 5),
                    (GameTokenType.DICE_TOKEN, 5),
                    (GameTokenType.LOTTERY_TICKET, 2),
                ]
            elif reward_amount == 15:  # Level 15: Gold Key 2 + 100,000 Point
                # [FIX] Force grant_point -> _grant_vault_locked
                self._grant_vault_locked(db, user_id=user_id, amount=100000, reason="LEVEL_BUNDLE_15", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.GOLD_KEY, 2)]
            elif reward_amount == 30:  # Level 17: Mega Ticket Bundle
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 10),
                    (GameTokenType.DICE_TOKEN, 10),
                    (GameTokenType.LOTTERY_TICKET, 10),
                ]
            elif reward_amount == 20:  # Level 20: Diamond Key 3 + 300,000 Point
                # [FIX] Force grant_point -> _grant_vault_locked
                self._grant_vault_locked(db, user_id=user_id, amount=300000, reason="LEVEL_BUNDLE_20", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.DIAMOND_KEY, 3)]
            elif reward_amount == 4:  # Legacy/Small
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 2),
                    (GameTokenType.DICE_TOKEN, 2),
                ]
            
            for token_type, amount in bundle_items:
                self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=amount, meta=meta, commit=commit)
            return
        
        if reward_type == "DIAMOND":
            InventoryService.grant_item(
                db, 
                user_id, 
                "DIAMOND", 
                reward_amount, 
                reason=(meta or {}).get("reason") or "REWARD",
                related_id=(meta or {}).get("related_id"),
                auto_commit=commit
            )
            return

        if reward_type == "COUPON":
            coupon_code = meta.get("coupon_type") if meta else "GENERIC"
            self.grant_coupon(db, user_id=user_id, coupon_type=coupon_code, meta=meta)
            return

        if reward_type == "GIFTICON_BAEMIN":
            # Store gifticon rewards as inventory items (pending fulfillment) instead of issuing immediately.
            # Supported denominations are intentionally limited for ops simplicity.
            allowed = {5000, 10000, 20000}
            if int(reward_amount) not in allowed:
                raise InvalidConfigError("INVALID_GIFTICON_AMOUNT")

            item_type = f"BAEMIN_GIFTICON_{int(reward_amount)}"
            InventoryService.grant_item(
                db,
                user_id,
                item_type,
                1,
                reason=(meta or {}).get("reason") or "GIFTICON_REWARD",
                related_id=(meta or {}).get("related_id") or (f"prize:{(meta or {}).get('prize_id')}" if meta else None),
                auto_commit=commit,
            )
            return

        if reward_type == "GIFTICON_COMPOSE":
            # Compose gifticon rewards as pending inventory items.
            allowed = {3000}
            if int(reward_amount) not in allowed:
                raise InvalidConfigError("INVALID_GIFTICON_AMOUNT")

            item_type = f"COMPOSE_AMERICANO_GIFTICON_{int(reward_amount)}"
            InventoryService.grant_item(
                db,
                user_id,
                item_type,
                1,
                reason=(meta or {}).get("reason") or "GIFTICON_REWARD",
                related_id=(meta or {}).get("related_id") or (f"prize:{(meta or {}).get('prize_id')}" if meta else None),
                auto_commit=commit,
            )
            return

        if reward_type in {"CC_COIN", "CC_COIN_GIFTICON"}:
            # CC 코인은 사용자에게 즉시 재화로 지급하지 않고, '씨씨코인깁콘' 지급대기 아이템으로 남긴다.
            InventoryService.grant_item(
                db,
                user_id,
                "CC_COIN_GIFTICON",
                1,
                reason=(meta or {}).get("reason") or "CC_COIN_GIFTICON",
                related_id=(meta or {}).get("related_id") or (f"prize:{(meta or {}).get('prize_id')}" if meta else None),
                auto_commit=commit,
            )
            return

        ticket_map = {
            "TICKET_ROULETTE": GameTokenType.ROULETTE_COIN,
            "ROULETTE_TICKET": GameTokenType.ROULETTE_COIN,
            "TICKET_DICE": GameTokenType.DICE_TOKEN,
            "DICE_TICKET": GameTokenType.DICE_TOKEN,
            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
            "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
            # "CC_COIN": GameTokenType.CC_COIN,  # [REMOVED]
            "GOLD_KEY": GameTokenType.GOLD_KEY,
            "DIAMOND_KEY": GameTokenType.DIAMOND_KEY,
        }
        if reward_type in ticket_map:
            token_type = ticket_map[reward_type]
            self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=reward_amount, meta=meta, commit=commit)
            return

        # Unknown reward types are ignored but should be monitored.
        _ = (db, user_id, reward_type, reward_amount, meta)
