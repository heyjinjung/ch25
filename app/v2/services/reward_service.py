"""V2 Reward service for coupons, points, and game tickets.

This service is decoupled from V1 and uses V2 models and services.
"""
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError
from app.v2.models import GameTokenType, V2User, UserCashLedger, User
from app.v2.services.inventory_service import V2InventoryService


class V2RewardService:
    """Centralize reward delivery (points, coupons, game tickets)."""

    def __init__(self) -> None:
        self.inventory_service = V2InventoryService()

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

        q = db.query(V2User).filter(V2User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()

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
        from app.v2.services.vault_service import V2VaultService  # pylint: disable=import-outside-toplevel

        ref_type = (meta or {}).get("ref_type") or "REWARD"
        reason_final = reason or (meta or {}).get("reason") or "REWARD"

        # VaultLedger에 기록되는 경로로 통일
        V2VaultService.deposit(
            db,
            user_id=user_id,
            amount=amount,
            reason=reason_final,
            ref_type=ref_type,
        )

        if commit:
            db.commit()
        else:
            db.flush()

    def grant_coupon(self, db: Session, user_id: int, coupon_type: str, meta: dict[str, Any] | None = None) -> None:
        """Grant a coupon to a user (DEPRECATED/REMOVED)."""
        pass

    def grant_ticket(self, db: Session, user_id: int, token_type: GameTokenType | str, amount: int, meta: dict[str, Any] | None = None, commit: bool = True) -> None:
        """Grant game tickets or DIAMOND to the user via V2 Inventory Service."""

        if isinstance(token_type, str):
            token_type = GameTokenType(token_type)

        self.inventory_service.grant_wallet_tokens(
            db,
            v2_user_id=user_id,
            token_type=token_type,
            amount=amount,
            reason=(meta or {}).get("reason") or "REWARD",
            label=(meta or {}).get("label") or "AUTO_GRANT",
            meta=meta,
            auto_commit=commit
        )

    def deliver(self, db: Session, user_id: int, reward_type: str, reward_amount: int, meta: dict[str, Any] | None = None, commit: bool = True) -> None:
        """Dispatch reward based on reward_type; no-op for NONE/zero."""

        if reward_amount == 0 or reward_type in {"NONE", "", None}:
            return

        # 1) GAME_XP: Season Level XP
        if reward_type == "GAME_XP":
            from app.v2.services.season_pass_service import V2SeasonPassService  # pylint: disable=import-outside-toplevel

            xp_amount = int(reward_amount)
            if xp_amount > 0:
                V2SeasonPassService().add_bonus_xp(db, user_id=user_id, xp_amount=xp_amount, commit=commit)
            return

        # 2) POINT: context-aware routing
        if reward_type == "POINT":
            settings = get_settings()
            reason = (meta or {}).get("reason") if meta else None
            source = (meta or {}).get("source") if meta else None
            label = (meta or {}).get("label") if meta else None

            is_game_point = str(reason or "").lower() == "dice_play" or (meta or {}).get("game_xp") is not None
            if is_game_point:
                if bool(getattr(settings, "xp_from_game_reward", False)):
                    from app.v2.services.season_pass_service import V2SeasonPassService  # pylint: disable=import-outside-toplevel
                    bonus = int((meta or {}).get("game_xp") or 0)
                    V2SeasonPassService().add_bonus_xp(
                        db,
                        user_id=user_id,
                        xp_amount=int(reward_amount) + bonus,
                        commit=commit,
                    )
                return

            is_season_pass_point = "SEASON_PASS" in str(source or "").upper() or "SEASON_PASS" in str(reason or "").upper()
            if is_season_pass_point:
                self._grant_vault_locked(
                    db,
                    user_id=user_id,
                    amount=reward_amount,
                    reason=reason or "SEASON_PASS_POINT",
                    label=label,
                    meta=meta,
                    commit=commit,
                )
                return

            self._grant_vault_locked(
                db,
                user_id=user_id,
                amount=reward_amount,
                reason=reason or "POINT",
                label=label,
                meta=meta,
                commit=commit,
            )
            return

        # 2b) CC_POINT: always vault_locked_balance
        if reward_type == "CC_POINT":
            reason = (meta or {}).get("reason") if meta else None
            label = (meta or {}).get("label") if meta else None
            self._grant_vault_locked(
                db,
                user_id=user_id,
                amount=reward_amount,
                reason=reason or "CC_POINT",
                label=label,
                meta=meta,
                commit=commit,
            )
            return

        # 3) BUNDLE: Multi-reward packages
        if reward_type in {"BUNDLE", "TICKET_BUNDLE"}:
            bundle_items = []
            if reward_amount == 3:
                bundle_items = [(GameTokenType.ROULETTE_TICKET, 1), (GameTokenType.DICE_TICKET, 1), (GameTokenType.LOTTERY_TICKET, 1)]
            elif reward_amount == 6:
                bundle_items = [(GameTokenType.ROULETTE_TICKET, 3), (GameTokenType.DICE_TICKET, 3)]
            elif reward_amount == 7:
                self._grant_vault_locked(db, user_id=user_id, amount=10000, reason="LEVEL_BUNDLE_7", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.GOLD_KEY_TICKET, 1)]
            elif reward_amount == 12:
                bundle_items = [(GameTokenType.ROULETTE_TICKET, 5), (GameTokenType.DICE_TICKET, 5), (GameTokenType.LOTTERY_TICKET, 2)]
            elif reward_amount == 15:
                self._grant_vault_locked(db, user_id=user_id, amount=100000, reason="LEVEL_BUNDLE_15", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.GOLD_KEY_TICKET, 2)]
            elif reward_amount == 30:
                bundle_items = [(GameTokenType.ROULETTE_TICKET, 10), (GameTokenType.DICE_TICKET, 10), (GameTokenType.LOTTERY_TICKET, 10)]
            elif reward_amount == 20:
                self._grant_vault_locked(db, user_id=user_id, amount=300000, reason="LEVEL_BUNDLE_20", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.DIAMOND_TICKET, 3)]
            elif reward_amount == 4:
                bundle_items = [(GameTokenType.ROULETTE_TICKET, 2), (GameTokenType.DICE_TICKET, 2)]
            # === Event Bundles (2026 Valentine & Seol) ===
            elif reward_amount == 21:  # DAY 2: 복권 1장 + 주사위 3장
                bundle_items = [(GameTokenType.LOTTERY_TICKET, 1), (GameTokenType.DICE_TICKET, 3)]
            elif reward_amount == 22:  # DAY 3: 포인트 20,000P + 다이아몬드 1장
                self._grant_vault_locked(db, user_id=user_id, amount=20000, reason="EVENT_SEOL_DAY3", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.DIAMOND_TICKET, 1)]
            elif reward_amount == 23:  # DAY 1: 포인트 10,000P + 룰렛 2장
                self._grant_vault_locked(db, user_id=user_id, amount=10000, reason="EVENT_SEOL_DAY1", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.ROULETTE_TICKET, 2)]
            elif reward_amount == 25:  # 4일 연속 보너스: 포인트 20,000P + 골드키 1개
                self._grant_vault_locked(db, user_id=user_id, amount=20000, reason="EVENT_SEOL_STREAK", meta=meta, commit=commit)
                bundle_items = [(GameTokenType.GOLD_KEY_TICKET, 1)]
            
            for token_type, amount in bundle_items:
                self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=amount, meta=meta, commit=commit)
            return
        
        if reward_type == "DIAMOND":
            self.grant_ticket(db, user_id=user_id, token_type=GameTokenType.DIAMOND, amount=reward_amount, meta=meta, commit=commit)
            return

        if reward_type == "GIFTICON_BAEMIN":
            allowed = {5000, 10000, 20000}
            if int(reward_amount) not in allowed:
                raise InvalidConfigError("INVALID_GIFTICON_AMOUNT")
            item_type = f"BAEMIN_GIFTICON_{int(reward_amount)}"
            self.inventory_service.grant_item(db, user_id, item_type, 1, reason=(meta or {}).get("reason") or "GIFTICON_REWARD", auto_commit=commit)
            return

        if reward_type == "GIFTICON_COMPOSE":
            allowed = {3000}
            if int(reward_amount) not in allowed:
                raise InvalidConfigError("INVALID_GIFTICON_AMOUNT")
            item_type = f"COMPOSE_AMERICANO_GIFTICON_{int(reward_amount)}"
            self.inventory_service.grant_item(db, user_id, item_type, 1, reason=(meta or {}).get("reason") or "GIFTICON_REWARD", auto_commit=commit)
            return

        if reward_type in {"CC_COIN", "CC_COIN_GIFTICON"}:
            self.inventory_service.grant_item(db, user_id, "CC_COIN_GIFTICON", 1, reason=(meta or {}).get("reason") or "CC_COIN_GIFTICON", auto_commit=commit)
            return

        if reward_type == "PUZZLE_C":
            import random
            outcome = random.choice([GameTokenType.PUZZLE_C1, GameTokenType.PUZZLE_C2])
            self.grant_ticket(db, user_id=user_id, token_type=outcome, amount=reward_amount, meta=meta, commit=commit)
            return

        if "GIFTICON" in reward_type:
            self.inventory_service.grant_item(db, user_id, reward_type, max(1, int(reward_amount)), reason=(meta or {}).get("reason") or "GIFTICON_REWARD", auto_commit=commit)
            return

        ticket_map = {
            "PUZZLE_J": GameTokenType.PUZZLE_J,
            "PUZZLE_M": GameTokenType.PUZZLE_M,
            "PUZZLE_C1": GameTokenType.PUZZLE_C1,
            "PUZZLE_C2": GameTokenType.PUZZLE_C2,
            "TICKET_ROULETTE": GameTokenType.ROULETTE_TICKET,
            "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
            "TICKET_DICE": GameTokenType.DICE_TICKET,
            "DICE_TICKET": GameTokenType.DICE_TICKET,
            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
            "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
            "GOLD_KEY_TICKET": GameTokenType.GOLD_KEY_TICKET,
            "DIAMOND_TICKET": GameTokenType.DIAMOND_TICKET,
            "GOLD_KEY_FRAGMENT": GameTokenType.GOLD_KEY_FRAGMENT,
            "DIAMOND_FRAGMENT": GameTokenType.DIAMOND_FRAGMENT,
            "ROULETTE_COIN": GameTokenType.ROULETTE_TICKET,
            "DICE_TOKEN": GameTokenType.DICE_TICKET,
            "GOLD_KEY": GameTokenType.GOLD_KEY_TICKET,
            "DIAMOND_KEY": GameTokenType.DIAMOND_TICKET,
        }
        if reward_type in ticket_map:
            token_type = ticket_map[reward_type]
            self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=reward_amount, meta=meta, commit=commit)
            return
