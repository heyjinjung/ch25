"""V2 reward delivery service (minimized V1 dependencies)."""
from __future__ import annotations

from typing import Any
import random

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError
from app.models.game_wallet import GameTokenType
from app.v2.services.admin_inventory_service import V2AdminInventoryService
from app.v2.services.vault_service import V2VaultService


class V2RewardService:
    """Deliver rewards using V2 services and legacy storage models."""

    def _grant_ticket(
        self,
        db: Session,
        *,
        user_id: int,
        token_type: GameTokenType,
        amount: int,
        meta: dict[str, Any] | None,
        commit: bool,
    ) -> None:
        V2AdminInventoryService.grant_tokens(
            db,
            user_id=user_id,
            token_type=token_type,
            amount=amount,
            reason=(meta or {}).get("reason") or "REWARD",
            label=(meta or {}).get("label") or "AUTO_GRANT",
            auto_commit=commit,
        )

    def _grant_item(
        self,
        db: Session,
        *,
        user_id: int,
        item_type: str,
        amount: int,
        meta: dict[str, Any] | None,
        commit: bool,
    ) -> None:
        related_id = (meta or {}).get("related_id")
        if not related_id and (meta or {}).get("prize_id") is not None:
            related_id = f"prize:{(meta or {}).get('prize_id')}"

        V2AdminInventoryService.grant_item(
            db,
            user_id=user_id,
            item_type=item_type,
            amount=max(1, int(amount)),
            reason=(meta or {}).get("reason") or "REWARD",
            related_id=related_id,
            auto_commit=commit,
        )

    def deliver(
        self,
        db: Session,
        *,
        user_id: int,
        reward_type: str,
        reward_amount: int,
        meta: dict[str, Any] | None = None,
        commit: bool = True,
    ) -> None:
        # NOTE: Storage SoT
        # - Wallet/Inventory는 legacy `user.id`를 FK로 사용한다.
        # - v2_user.id와 legacy user.id가 1:1 동일하므로, V2User.id 직접 사용
        storage_user_id = user_id

        if reward_amount == 0 or reward_type in {"NONE", "", None}:
            return

        if reward_type == "GAME_XP":
            from app.v2.services.season_pass_service import V2SeasonPassService

            xp_amount = int(reward_amount)
            if xp_amount > 0:
                V2SeasonPassService().add_bonus_xp(db, user_id=user_id, xp_amount=xp_amount, commit=commit)
            return

        if reward_type in {"POINT", "CC_POINT"}:
            V2VaultService.deposit(db, user_id=storage_user_id, amount=int(reward_amount))
            if commit:
                db.commit()
            else:
                db.flush()
            return

        if reward_type in {"BUNDLE", "TICKET_BUNDLE"}:
            bundle_items: list[tuple[GameTokenType, int]] = []
            if reward_amount == 3:
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 1),
                    (GameTokenType.DICE_TOKEN, 1),
                    (GameTokenType.LOTTERY_TICKET, 1),
                ]
            elif reward_amount == 6:
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 3),
                    (GameTokenType.DICE_TOKEN, 3),
                ]
            elif reward_amount == 7:
                V2VaultService.deposit(db, user_id=user_id, amount=10000)
                bundle_items = [(GameTokenType.GOLD_KEY, 1)]
            elif reward_amount == 12:
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 5),
                    (GameTokenType.DICE_TOKEN, 5),
                    (GameTokenType.LOTTERY_TICKET, 2),
                ]
            elif reward_amount == 15:
                V2VaultService.deposit(db, user_id=user_id, amount=100000)
                bundle_items = [(GameTokenType.GOLD_KEY, 2)]
            elif reward_amount == 30:
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 10),
                    (GameTokenType.DICE_TOKEN, 10),
                    (GameTokenType.LOTTERY_TICKET, 10),
                ]
            elif reward_amount == 20:
                V2VaultService.deposit(db, user_id=user_id, amount=300000)
                bundle_items = [(GameTokenType.DIAMOND_KEY, 3)]
            elif reward_amount == 4:
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 2),
                    (GameTokenType.DICE_TOKEN, 2),
                ]

            for token_type, amount in bundle_items:
                self._grant_ticket(db, user_id=storage_user_id, token_type=token_type, amount=amount, meta=meta, commit=commit)
            return

        if reward_type == "DIAMOND":
            self._grant_ticket(db, user_id=storage_user_id, token_type=GameTokenType.DIAMOND, amount=reward_amount, meta=meta, commit=commit)
            return

        if reward_type == "GIFTICON_BAEMIN":
            allowed = {5000, 10000, 20000}
            if int(reward_amount) not in allowed:
                raise InvalidConfigError("INVALID_GIFTICON_AMOUNT")
            item_type = f"BAEMIN_GIFTICON_{int(reward_amount)}"
            self._grant_item(db, user_id=storage_user_id, item_type=item_type, amount=1, meta=meta, commit=commit)
            return

        if reward_type == "GIFTICON_COMPOSE":
            allowed = {3000}
            if int(reward_amount) not in allowed:
                raise InvalidConfigError("INVALID_GIFTICON_AMOUNT")
            item_type = f"COMPOSE_AMERICANO_GIFTICON_{int(reward_amount)}"
            self._grant_item(db, user_id=storage_user_id, item_type=item_type, amount=1, meta=meta, commit=commit)
            return

        if reward_type in {"CC_COIN", "CC_COIN_GIFTICON"}:
            self._grant_item(db, user_id=storage_user_id, item_type="CC_COIN_GIFTICON", amount=1, meta=meta, commit=commit)
            return

        if reward_type == "PUZZLE_C":
            outcome = random.choice([GameTokenType.PUZZLE_C1, GameTokenType.PUZZLE_C2])
            self._grant_ticket(db, user_id=storage_user_id, token_type=outcome, amount=reward_amount, meta=meta, commit=commit)
            return

        if "GIFTICON" in str(reward_type):
            self._grant_item(db, user_id=storage_user_id, item_type=str(reward_type), amount=reward_amount, meta=meta, commit=commit)
            return

        ticket_map = {
            "PUZZLE_J": GameTokenType.PUZZLE_J,
            "PUZZLE_M": GameTokenType.PUZZLE_M,
            "PUZZLE_C1": GameTokenType.PUZZLE_C1,
            "PUZZLE_C2": GameTokenType.PUZZLE_C2,
            # V2 Standard Names
            "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
            "DICE_TICKET": GameTokenType.DICE_TICKET,
            "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
            "GOLD_KEY_TICKET": GameTokenType.GOLD_KEY_TICKET,
            "DIAMOND_TICKET": GameTokenType.DIAMOND_TICKET,
            # V1 Legacy Names (for backward compatibility)
            "TICKET_ROULETTE": GameTokenType.ROULETTE_TICKET,
            "ROULETTE_COIN": GameTokenType.ROULETTE_TICKET,
            "TICKET_DICE": GameTokenType.DICE_TICKET,
            "DICE_TOKEN": GameTokenType.DICE_TICKET,
            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
            "GOLD_KEY": GameTokenType.GOLD_KEY,
            "DIAMOND_KEY": GameTokenType.DIAMOND_KEY,
            "GOLD_KEY_FRAGMENT": GameTokenType.GOLD_KEY_FRAGMENT,
            "DIAMOND_FRAGMENT": GameTokenType.DIAMOND_FRAGMENT,
            "TRIAL_TICKET": GameTokenType.TRIAL_TICKET,
        }

        if reward_type in ticket_map:
            self._grant_ticket(
                db,
                user_id=storage_user_id,
                token_type=ticket_map[reward_type],
                amount=reward_amount,
                meta=meta,
                commit=commit,
            )
            return

        _ = (db, user_id, reward_type, reward_amount, meta, commit)
