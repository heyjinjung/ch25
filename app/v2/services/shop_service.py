"""V2 shop service (Vault SoT: locked balance)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.game_wallet import GameTokenType
from app.v2.models.user import V2User
from app.v2.models.v2_shop_order import V2ShopOrder
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.vault_service import V2VaultService


class V2ShopService:
    @staticmethod
    def purchase(
        db: Session,
        *,
        user_id: int,
        sku: str,
        name: str,
        cost_type: str = "VAULT",
        cost_amount: int,
        reward_type: str,
        reward_amount: int,
    ) -> V2ShopOrder:
        if cost_amount <= 0:
            raise ValueError("cost_amount must be > 0")
        if reward_type != "NONE" and reward_amount <= 0:
            raise ValueError("reward_amount must be > 0")

        normalized_cost = (cost_type or "VAULT").strip().upper()
        if normalized_cost not in {"VAULT", "DIAMOND"}:
            raise ValueError("INVALID_COST_TYPE")

        if normalized_cost == "VAULT":
            user = db.get(V2User, user_id)
            if user is None:
                raise ValueError("USER_NOT_FOUND")
            current = int(user.vault_locked_balance or 0)
            if current < cost_amount:
                raise ValueError("INSUFFICIENT_BALANCE")
            user.vault_locked_balance = current - cost_amount
            db.add(user)
        else:
            V2InventoryService.consume_wallet_tokens(
                db,
                user_id,
                GameTokenType.DIAMOND,
                int(cost_amount),
                reason="V2_SHOP_PURCHASE",
                auto_commit=False,
            )

        order = V2ShopOrder(
            user_id=user_id,
            sku=sku,
            name=name,
            cost_type=normalized_cost,
            cost_amount=cost_amount,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )
        db.add(order)
        db.flush()
        return order

    @staticmethod
    def grant_reward(
        db: Session,
        *,
        user_id: int,
        reward_type: str,
        reward_amount: int,
    ) -> None:
        normalized_reward = (reward_type or "").strip().upper()
        if normalized_reward in {"", "NONE"} or reward_amount <= 0:
            return

        if normalized_reward in {"VAULT", "POINT", "CC_POINT"}:
            V2VaultService.deposit(db, user_id, int(reward_amount))
            return

        try:
            token_type = GameTokenType(normalized_reward)
        except Exception:
            token_type = None

        if token_type is not None and token_type != GameTokenType.VAULT:
            V2InventoryService.grant_wallet_tokens(
                db,
                user_id,
                token_type,
                int(reward_amount),
                reason="V2_SHOP_PURCHASE",
                auto_commit=False,
            )
            return

        V2InventoryService.grant_item(
            db,
            user_id,
            item_type=normalized_reward,
            amount=int(reward_amount),
            reason="V2_SHOP_PURCHASE",
            auto_commit=False,
        )
