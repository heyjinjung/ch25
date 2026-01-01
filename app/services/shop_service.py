"""Service for shop purchases."""
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService
from app.services.idempotency_service import IdempotencyService
from app.models.user import User


class ShopProduct:
    def __init__(self, sku: str, title: str, cost_token: GameTokenType, cost_amount: int, item_type: str, item_amount: int):
        self.sku = sku
        self.title = title
        self.cost_token = cost_token
        self.cost_amount = cost_amount
        self.item_type = item_type
        self.item_amount = item_amount

    def to_dict(self):
        return {
            "sku": self.sku,
            "title": self.title,
            "cost": {"token": self.cost_token.value, "amount": self.cost_amount},
            "grant": {"item_type": self.item_type, "amount": self.item_amount},
        }


# Hardcoded Products
SHOP_PRODUCTS = {
    "PROD_GOLD_KEY_1": ShopProduct(
        "PROD_GOLD_KEY_1", 
        "골드키 교환권", 
        GameTokenType.DIAMOND, 
        30, 
        "VOUCHER_GOLD_KEY_1", 
        1
    ),
    "PROD_DIAMOND_KEY_1": ShopProduct(
        "PROD_DIAMOND_KEY_1", 
        "다이아키 교환권", 
        GameTokenType.DIAMOND, 
        300, 
        "VOUCHER_DIAMOND_KEY_1", 
        1
    ),
}


class ShopService:
    """Provides methods to manage shop and purchases."""

    @staticmethod
    def list_products() -> list[dict]:
        """List all available products."""
        return [p.to_dict() for p in SHOP_PRODUCTS.values()]

    @staticmethod
    def purchase_product(db: Session, user_id: int, sku: str, idempotency_key: str | None = None) -> dict:
        """Purchase a product."""
        product = SHOP_PRODUCTS.get(sku)
        if not product:
            raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")

        user = db.get(User, user_id)
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        request_payload = {"sku": sku}
        idem_record = None
        if idempotency_key:
            idem_record, existing = IdempotencyService.begin(
                db,
                user_id=user_id,
                scope="shop_purchase",
                idempotency_key=idempotency_key,
                request_payload=request_payload,
            )
            if existing is not None:
                return existing

        # Atomic Transaction
        try:
            # 1. Deduct verify & execute
            # Phase 2: If cost_token is DIAMOND, consume from Inventory
            if product.cost_token == GameTokenType.DIAMOND:
                InventoryService.consume_item(
                    db,
                    user_id,
                    "DIAMOND",
                    product.cost_amount,
                    reason=f"SHOP_PURCHASE:{sku}",
                    related_id=sku,
                    auto_commit=False
                )
            else:
                # Wallet Token Consumption
                wallet_service = GameWalletService()
                wallet_service.require_and_consume_token(
                    db, 
                    user_id, 
                    product.cost_token, 
                    product.cost_amount, 
                    reason=f"SHOP_PURCHASE:{sku}",
                    auto_commit=False
                )

            # 2. Grant Item
            InventoryService.grant_item(
                db,
                user_id,
                product.item_type,
                product.item_amount,
                reason=f"SHOP_PURCHASE:{sku}",
                related_id=sku,
                auto_commit=False
            )

            response = {
                "success": True,
                "sku": sku,
                "cost": {"token": product.cost_token.value, "amount": product.cost_amount},
                "granted": {"item_type": product.item_type, "amount": product.item_amount},
            }

            if idem_record is not None:
                IdempotencyService.complete(db, record=idem_record, response_payload=response)

            db.commit()
            
        except Exception as e:
            db.rollback()
            raise e
            
        return response
