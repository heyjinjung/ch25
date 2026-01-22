"""Service for shop purchases."""
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService
from app.services.idempotency_service import IdempotencyService
from app.services.ui_config_service import UiConfigService
from app.models.user import User


class ShopProduct:
    def __init__(
        self,
        sku: str,
        title: str,
        cost_token: GameTokenType,
        cost_amount: int,
        item_type: str,
        item_amount: int,
        *,
        is_active: bool = True,
    ):
        self.sku = sku
        self.title = title
        self.cost_token = cost_token
        self.cost_amount = cost_amount
        self.item_type = item_type
        self.item_amount = item_amount
        self.is_active = is_active

    def to_dict(self):
        return {
            "sku": self.sku,
            "title": self.title,
            "cost": {"token": self.cost_token.value, "amount": self.cost_amount},
            "grant": {"item_type": self.item_type, "amount": self.item_amount},
            "is_active": bool(self.is_active),
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
    "PROD_TICKET_COIN_1": ShopProduct(
        "PROD_TICKET_COIN_1",
        "룰렛 티켓 교환권",
        GameTokenType.DIAMOND,
        1,
        "VOUCHER_ROULETTE_COIN_1",
        1
    ),
    "PROD_TICKET_DICE_1": ShopProduct(
        "PROD_TICKET_DICE_1",
        "주사위 티켓 교환권",
        GameTokenType.DIAMOND,
        2,
        "VOUCHER_DICE_TOKEN_1",
        1
    ),
    "PROD_TICKET_LOTTERY_1": ShopProduct(
        "PROD_TICKET_LOTTERY_1",
        "복권 티켓 교환권",
        GameTokenType.DIAMOND,
        10,
        "VOUCHER_LOTTERY_TICKET_1",
        1,
    ),
}


class ShopService:
    """Provides methods to manage shop and purchases."""

    UI_CONFIG_KEY = "shop_products"

    @staticmethod
    def _load_product_overrides(db: Session) -> dict[str, dict]:
        row = UiConfigService.get(db, ShopService.UI_CONFIG_KEY)
        value = row.value_json if row and isinstance(row.value_json, dict) else {}
        products = value.get("products") if isinstance(value, dict) else None
        if not isinstance(products, dict):
            return {}
        # Expected shape: { "products": { "SKU": {"title": str?, "cost_amount": int?, "is_active": bool?} } }
        overrides: dict[str, dict] = {}
        for sku, patch in products.items():
            if not isinstance(sku, str) or not isinstance(patch, dict):
                continue
            overrides[sku] = patch
        return overrides

    @staticmethod
    def _parse_cost_token(raw) -> GameTokenType | None:
        if isinstance(raw, GameTokenType):
            return raw
        if isinstance(raw, str):
            cleaned = raw.strip()
            if not cleaned:
                return None
            for candidate in {cleaned, cleaned.upper()}:
                try:
                    return GameTokenType(candidate)
                except ValueError:
                    continue
            return None
        return None

    @staticmethod
    def _parse_int(raw) -> int | None:
        if isinstance(raw, bool):
            return None
        if isinstance(raw, int):
            return raw
        if isinstance(raw, float):
            if raw.is_integer():
                return int(raw)
            return None
        if isinstance(raw, str):
            cleaned = raw.strip()
            if not cleaned:
                return None
            try:
                return int(cleaned)
            except ValueError:
                try:
                    as_float = float(cleaned)
                except ValueError:
                    return None
                return int(as_float) if as_float.is_integer() else None
        return None

    @staticmethod
    def _parse_bool(raw) -> bool | None:
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            normalized = raw.strip().lower()
            if normalized in {"true", "1", "yes", "y"}:
                return True
            if normalized in {"false", "0", "no", "n"}:
                return False
        return None

    @staticmethod
    def _build_custom_product(sku: str, patch: dict) -> ShopProduct | None:
        if not isinstance(patch, dict):
            return None

        title = patch.get("title")
        cost_token = ShopService._parse_cost_token(patch.get("cost_token"))
        cost_amount = ShopService._parse_int(patch.get("cost_amount"))
        item_type = patch.get("item_type")
        item_amount = ShopService._parse_int(patch.get("item_amount"))
        is_active = ShopService._parse_bool(patch.get("is_active"))

        if not isinstance(title, str) or not title.strip():
            return None
        if cost_token is None:
            return None
        if cost_amount is None or cost_amount <= 0:
            return None
        if not isinstance(item_type, str) or not item_type.strip():
            return None
        if item_amount is None or item_amount <= 0:
            return None

        return ShopProduct(
            sku,
            title.strip(),
            cost_token,
            cost_amount,
            item_type.strip(),
            item_amount,
            is_active=is_active if is_active is not None else True,
        )

    @staticmethod
    def _apply_overrides(product: ShopProduct, patch: dict) -> None:
        if not isinstance(patch, dict):
            return
        title = patch.get("title")
        if isinstance(title, str) and title.strip():
            product.title = title.strip()

        cost_token = ShopService._parse_cost_token(patch.get("cost_token"))
        if cost_token is not None:
            product.cost_token = cost_token

        cost_amount = ShopService._parse_int(patch.get("cost_amount"))
        if cost_amount is not None and cost_amount > 0:
            product.cost_amount = cost_amount

        item_type = patch.get("item_type")
        if isinstance(item_type, str) and item_type.strip():
            product.item_type = item_type.strip()

        item_amount = ShopService._parse_int(patch.get("item_amount"))
        if item_amount is not None and item_amount > 0:
            product.item_amount = item_amount

        is_active = ShopService._parse_bool(patch.get("is_active"))
        if is_active is not None:
            product.is_active = is_active

    @staticmethod
    def list_products(db: Session) -> list[dict]:
        """List all available products."""
        overrides = ShopService._load_product_overrides(db)
        products: list[dict] = []
        for sku, base in SHOP_PRODUCTS.items():
            p = ShopProduct(
                base.sku,
                base.title,
                base.cost_token,
                base.cost_amount,
                base.item_type,
                base.item_amount,
                is_active=getattr(base, "is_active", True),
            )
            ShopService._apply_overrides(p, overrides.get(sku, {}))
            d = p.to_dict()
            d["source"] = "builtin"
            products.append(d)

        # Custom products defined in UI config
        for sku, patch in overrides.items():
            if sku in SHOP_PRODUCTS:
                continue
            custom = ShopService._build_custom_product(sku, patch)
            if custom is None:
                continue
            d = custom.to_dict()
            d["source"] = "custom"
            products.append(d)

        products.sort(key=lambda x: str(x.get("sku", "")))
        return products

    @staticmethod
    def purchase_product(db: Session, user_id: int, sku: str, idempotency_key: str | None = None) -> dict:
        """Purchase a product."""
        overrides = ShopService._load_product_overrides(db)

        base = SHOP_PRODUCTS.get(sku)
        if base:
            product = ShopProduct(
                base.sku,
                base.title,
                base.cost_token,
                base.cost_amount,
                base.item_type,
                base.item_amount,
                is_active=getattr(base, "is_active", True),
            )
            ShopService._apply_overrides(product, overrides.get(sku, {}))
        else:
            custom = ShopService._build_custom_product(sku, overrides.get(sku, {}))
            if custom is None:
                raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")
            product = custom

        if not product.is_active:
            raise HTTPException(status_code=400, detail="PRODUCT_INACTIVE")

        user = db.get(User, user_id)
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # [Strict Vault Policy] Check Benefit Suspension
        # If user is INACTIVE (no deposit > 7 days), they cannot purchase shop items (Giftycons, etc.)
        from app.services.vault_service import VaultService
        from datetime import datetime
        policy = VaultService.get_user_vault_policy(db, user, datetime.utcnow())
        if policy.get("benefits_suspended"):
            raise HTTPException(
                status_code=403, 
                detail="입금을 하셔야 경품 응모 및 상점 이용이 가능합니다", 
                headers={"X-Reason": "DEPOSIT_REQUIRED"}
            )

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
                # [MIGRATED] DIAMOND consumed from Wallet (SoT v1.1)
                wallet_service = GameWalletService()
                wallet_service.require_and_consume_token(
                    db,
                    user_id,
                    GameTokenType.DIAMOND,
                    product.cost_amount,
                    reason=f"SHOP_PURCHASE:{sku}",
                    auto_commit=False
                )
            elif product.cost_token == GameTokenType.VAULT:
                 # Phase 2: Vault Buy-in
                 from app.services.vault_service import VaultService
                 VaultService().consume_locked_balance(
                     db,
                     user_id,
                     product.cost_amount,
                     reason=f"SHOP_PURCHASE:{sku}"
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
            # For VAULT purchases: if item_type is a direct token type (not voucher),
            # grant directly to GameWallet instead of Inventory
            direct_token_types = {
                "ROULETTE_COIN",
                "DICE_TOKEN",
                "LOTTERY_TICKET",
                "TRIAL_TOKEN",
                "GOLD_KEY",
                "DIAMOND_KEY",
            }

            is_vault_purchase = product.cost_token == GameTokenType.VAULT
            is_direct_token = product.item_type.upper() in direct_token_types

            reward_token = None
            reward_amount = None

            if is_vault_purchase and is_direct_token:
                # Direct grant to GameWallet (bypass Inventory for immediate usability)
                try:
                    target_token = GameTokenType(product.item_type.upper())
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"INVALID_TOKEN_TYPE:{product.item_type}")
                
                wallet_service = GameWalletService()
                wallet_service.grant_tokens(
                    db,
                    user_id,
                    target_token,
                    product.item_amount,
                    reason=f"SHOP_PURCHASE:{sku}",
                    auto_commit=False
                )
                reward_token = target_token.value
                reward_amount = product.item_amount
            else:
                # Standard flow: grant to Inventory
                InventoryService.grant_item(
                    db,
                    user_id,
                    product.item_type,
                    product.item_amount,
                    reason=f"SHOP_PURCHASE:{sku}",
                    related_id=sku,
                    auto_commit=False
                )

                # 3. Auto-fulfill certain vouchers immediately (voucher -> wallet token)
                auto_fulfill_vouchers = {
                    "VOUCHER_GOLD_KEY_1",
                    "VOUCHER_DIAMOND_KEY_1",
                    "VOUCHER_ROULETTE_COIN_1",
                    "VOUCHER_DICE_TOKEN_1",
                    "VOUCHER_LOTTERY_TICKET_1",
                }

                if product.item_type in auto_fulfill_vouchers:
                    use_result = InventoryService.use_voucher(
                        db,
                        user_id,
                        product.item_type,
                        product.item_amount,
                        idempotency_key=None,
                        auto_commit=False,
                    )
                    reward_token = use_result.get("reward_token")
                    reward_amount = use_result.get("reward_amount")

            response = {
                "success": True,
                "sku": sku,
                "cost": {"token": product.cost_token.value, "amount": product.cost_amount},
                "granted": {
                    "item_type": reward_token or product.item_type,
                    "amount": reward_amount if reward_amount is not None else product.item_amount,
                },
                "auto_fulfilled": bool(reward_token),
            }

            if reward_token is not None:
                response["reward_token"] = reward_token
                response["reward_amount"] = reward_amount

            if idem_record is not None:
                IdempotencyService.complete(db, record=idem_record, response_payload=response)

            db.commit()
            
        except Exception as e:
            db.rollback()
            raise e
            
        return response
