"""Service for managing user inventory items."""
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException

from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.services.game_wallet_service import GameWalletService


class InventoryService:
    """Provides methods to manage user inventory."""

    @staticmethod
    def get_inventory(db: Session, user_id: int) -> list[UserInventoryItem]:
        """Get all items for a user."""
        return db.scalars(
            select(UserInventoryItem).where(UserInventoryItem.user_id == user_id)
        ).all()

    @staticmethod
    def grant_item(
        db: Session,
        user_id: int,
        item_type: str,
        amount: int,
        reason: str,
        related_id: str | None = None,
        auto_commit: bool = True
    ) -> UserInventoryItem:
        """Grant items to user."""
        if amount <= 0:
            raise ValueError("Amount must be positive")

        item = db.scalar(
            select(UserInventoryItem).where(
                and_(UserInventoryItem.user_id == user_id, UserInventoryItem.item_type == item_type)
            )
        )

        if not item:
            item = UserInventoryItem(user_id=user_id, item_type=item_type, quantity=0)
            db.add(item)
            db.flush()  # to get ID? Not needed for quantity update logic but good for consistency

        item.quantity += amount
        
        # Ledger
        ledger = UserInventoryLedger(
            user_id=user_id,
            item_type=item_type,
            change_amount=amount,
            balance_after=item.quantity,
            reason=reason,
            related_id=related_id
        )
        db.add(ledger)
        if auto_commit:
            db.commit()
            db.refresh(item)
        return item

    @staticmethod
    def consume_item(
        db: Session,
        user_id: int,
        item_type: str,
        amount: int,
        reason: str,
        related_id: str | None = None,
        auto_commit: bool = True
    ) -> UserInventoryItem:
        """Consume items from user."""
        if amount <= 0:
            raise ValueError("Amount must be positive")

        item = db.scalar(
            select(UserInventoryItem).where(
                and_(UserInventoryItem.user_id == user_id, UserInventoryItem.item_type == item_type)
            ).with_for_update()
        )

        if not item or item.quantity < amount:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_ITEM_QUANTITY")

        item.quantity -= amount

        # Ledger
        ledger = UserInventoryLedger(
            user_id=user_id,
            item_type=item_type,
            change_amount=-amount,
            balance_after=item.quantity,
            reason=reason,
            related_id=related_id
        )
        db.add(ledger)
        if auto_commit:
            db.commit()
            db.refresh(item)
        
        return item

    @staticmethod
    def use_voucher(db: Session, user_id: int, item_type: str, amount: int) -> dict:
        """
        Use a voucher item to get rewards.
        This is a high-level action that consumes the item and grants rewards.
        """
        
        # Mappings of Voucher -> Reward
        REWARD_MAP = {
            "VOUCHER_GOLD_KEY_1": {"token": GameTokenType.GOLD_KEY, "amount": 1},
            "VOUCHER_DIAMOND_KEY_1": {"token": GameTokenType.DIAMOND_KEY, "amount": 1},
        }

        reward = REWARD_MAP.get(item_type)
        if not reward:
            raise HTTPException(status_code=400, detail="INVALID_VOUCHER_TYPE")
        
        total_reward_amount = reward["amount"] * amount
        token_type = reward["token"]

        try:
            # Transaction bundle
            InventoryService.consume_item(
                db, user_id, item_type, amount, reason="USE_VOUCHER", auto_commit=False
            )
            
            # Grant Reward
            user = db.get(User, user_id)
            GameWalletService.grant_tokens(
                db, user_id, token_type, total_reward_amount, reason=f"VOUCHER_USE:{item_type}", auto_commit=False
            )
            
            db.commit()
            
            return {
                "success": True,
                "used_item": item_type,
                "used_amount": amount,
                "reward_token": token_type.value,
                "reward_amount": total_reward_amount
            }
        except Exception as e:
            db.rollback()
            raise e
