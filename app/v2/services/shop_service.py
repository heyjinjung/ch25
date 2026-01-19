"""V2 shop service (Vault SoT: locked balance)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.v2.models.v2_shop_order import V2ShopOrder


class V2ShopService:
    @staticmethod
    def purchase(
        db: Session,
        *,
        user_id: int,
        sku: str,
        name: str,
        cost_amount: int,
        reward_type: str,
        reward_amount: int,
    ) -> V2ShopOrder:
        if cost_amount <= 0:
            raise ValueError("cost_amount must be > 0")
        if reward_amount <= 0:
            raise ValueError("reward_amount must be > 0")

        user = db.get(V2User, user_id)
        if user is None:
            raise ValueError("user not found")

        current = int(user.vault_locked_balance or 0)
        if current < cost_amount:
            raise ValueError("insufficient locked balance")

        user.vault_locked_balance = current - cost_amount
        order = V2ShopOrder(
            user_id=user_id,
            sku=sku,
            name=name,
            cost_type="VAULT",
            cost_amount=cost_amount,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )
        db.add(order)
        db.add(user)
        db.flush()
        return order
