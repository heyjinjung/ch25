"""V2 shop service (Vault SoT: locked balance)."""
from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.v2.models import GameTokenType
from app.v2.models.v2_shop_order import V2ShopOrder
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.vault_service import V2VaultService

logger = logging.getLogger(__name__)


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
        skip_suspension_check: bool = False,
    ) -> V2ShopOrder:
        """Purchase a shop product.
        
        SoT: v2_strict_vault_policy_sot_ko.md
        - benefits_suspended=True인 유저는 구매 차단 (403)
        
        Args:
            skip_suspension_check: 관리자 강제 구매 시 True (기본 False)
        
        Raises:
            ValueError("BENEFITS_SUSPENDED"): 7일 무입금 유저의 구매 시도
        """
        # === Strict Vault Policy: benefits_suspended 체크 ===
        if not skip_suspension_check:
            is_suspended, deposit_7d = V2VaultService.is_benefits_suspended(db, user_id)
            if is_suspended:
                logger.warning(
                    f"[SHOP] Purchase blocked: user_id={user_id} benefits_suspended=True, "
                    f"deposit_7d={deposit_7d}, sku={sku}"
                )
                raise ValueError("BENEFITS_SUSPENDED")
        
        if cost_amount <= 0:
            raise ValueError("cost_amount must be > 0")
        if reward_type != "NONE" and reward_amount <= 0:
            raise ValueError("reward_amount must be > 0")

        normalized_cost = (cost_type or "VAULT").strip().upper()
        if normalized_cost in {"POINT", "CC_POINT", "VAULT"}:
            normalized_cost = "VAULT"
        if normalized_cost not in {"VAULT", "DIAMOND"}:
            raise ValueError("INVALID_COST_TYPE")

        if normalized_cost == "VAULT":
            try:
                V2VaultService.consume_locked_for_spend(
                    db,
                    user_id,
                    int(cost_amount),
                    reason="V2_SHOP_PURCHASE",
                )
            except ValueError as exc:
                if "insufficient" in str(exc).lower():
                    raise ValueError("INSUFFICIENT_BALANCE") from exc
                raise
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
            V2VaultService.deposit(db, user_id, int(reward_amount), reason="SHOP_REWARD", ref_type="SHOP")
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
