from sqlalchemy.orm import Session
from app.core.exceptions import InvalidConfigError
from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService

class ExchangeService:
    def __init__(self):
        self.wallet_service = GameWalletService()

    def craft_key(self, db: Session, user_id: int, target_token_type: str) -> dict:
        """
        Exchange fragments for a key.
        - GOLD_KEY: 10 GOLD_KEY_FRAGMENT
        - DIAMOND_KEY: 30 DIAMOND_KEY_FRAGMENT
        """
        
        # 1. Determine Cost & Source Token
        if target_token_type == GameTokenType.GOLD_KEY.value:
            source_token = GameTokenType.GOLD_KEY_FRAGMENT
            required_amount = 10
        elif target_token_type == GameTokenType.DIAMOND_KEY.value:
            source_token = GameTokenType.DIAMOND_KEY_FRAGMENT
            required_amount = 30
        elif target_token_type == "GOLD_KEY_FROM_PUZZLE":
            # Special Recipe: 1*C1 + 1*C2 + 1*J + 1*M -> 1 GOLD_KEY
            required_tokens = [
                (GameTokenType.PUZZLE_C1, 1),
                (GameTokenType.PUZZLE_C2, 1),
                (GameTokenType.PUZZLE_J, 1),
                (GameTokenType.PUZZLE_M, 1)
            ]
            
            # Consume all required tokens
            for token_type, amount in required_tokens:
                self.wallet_service.require_and_consume_token(
                    db,
                    user_id,
                    token_type,
                    amount=amount,
                    reason="CRAFT_PUZZLE_COST",
                    label=f"Craft {target_token_type}"
                )

            # Grant Reward
            self.wallet_service.grant_tokens(
                db,
                user_id,
                GameTokenType.GOLD_KEY,
                amount=1,
                reason="CRAFT_PUZZLE_REWARD",
                label="Crafted from CCJM Puzzle"
            )

            return {
                "result": "OK",
                "reward_token": "GOLD_KEY",
                "reward_amount": 1,
                "used_token": "PUZZLE_C_J_M",
                "used_amount": 0 # Composite cost
            }

        else:
            raise InvalidConfigError(f"Unsupported craft target: {target_token_type}")

        # 2. Consume Fragments
        # This will raise NotEnoughTokensError if balance is insufficient
        self.wallet_service.require_and_consume_token(
            db, 
            user_id, 
            source_token, 
            amount=required_amount, 
            reason="CRAFT_KEY_COST",
            label=f"Craft {target_token_type}"
        )

        # 3. Grant Key
        self.wallet_service.grant_tokens(
            db, 
            user_id, 
            GameTokenType(target_token_type), 
            amount=1, 
            reason="CRAFT_KEY_REWARD",
            label=f"Crafted from {source_token.value}"
        )

        return {
            "result": "OK",
            "reward_token": target_token_type,
            "reward_amount": 1,
            "used_token": source_token.value,
            "used_amount": required_amount
        }
