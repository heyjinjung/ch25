"""V2 Exchange Service - Puzzle Collection → Gold Key Craft

SoT: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/20260131_puzzle_collection_gold_key_craft.md
"""
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError, NotEnoughTokensError
from app.v2.models import GameTokenType
from app.v2.services.inventory_service import V2InventoryService


class V2ExchangeService:
    """V2 교환 서비스 - 퍼즐 조합 → 골드키 교환"""

    @staticmethod
    def craft_puzzle_to_gold_key(db: Session, user_id: int) -> dict:
        """
        C1 + C2 + J + M 퍼즐 4개를 GOLD_KEY_TICKET 1개로 교환.
        
        Required Tokens:
        - PUZZLE_C1: 1개
        - PUZZLE_C2: 1개
        - PUZZLE_J: 1개
        - PUZZLE_M: 1개
        
        Reward:
        - GOLD_KEY_TICKET: 1개
        
        Raises:
            NotEnoughTokensError: 퍼즐 조각이 부족한 경우
        """
        required_tokens = [
            (GameTokenType.PUZZLE_C1, 1),
            (GameTokenType.PUZZLE_C2, 1),
            (GameTokenType.PUZZLE_J, 1),
            (GameTokenType.PUZZLE_M, 1),
        ]
        
        # 1. 잔액 사전 확인 (원자적 실패를 위해)
        for token_type, required in required_tokens:
            balance = V2InventoryService.get_wallet_balance(db, user_id, token_type)
            if (balance or 0) < required:
                raise NotEnoughTokensError(
                    f"Insufficient {token_type.value}: need {required}, have {balance or 0}"
                )
        
        # 2. 퍼즐 조각 소비
        consumed = {}
        for token_type, amount in required_tokens:
            V2InventoryService.consume_wallet_tokens(
                db,
                user_id,
                token_type,
                amount,
                reason="CRAFT_PUZZLE_TO_GOLD_KEY",
                meta={"craft_target": "GOLD_KEY_TICKET"},
            )
            consumed[token_type.value] = amount
        
        # 3. 골드키 티켓 지급
        V2InventoryService.grant_wallet_tokens(
            db,
            user_id,
            GameTokenType.GOLD_KEY_TICKET,
            1,
            reason="CRAFT_PUZZLE_REWARD",
            meta={"source": "PUZZLE_COLLECTION"},
        )
        
        db.commit()
        
        return {
            "result": "OK",
            "reward_token": "GOLD_KEY_TICKET",
            "reward_amount": 1,
            "consumed_tokens": consumed,
            "message": "퍼즐 컬렉션 완성! 황금열쇠 1개 획득",
        }

    @staticmethod
    def get_craft_status(db: Session, user_id: int) -> dict:
        """퍼즐 교환 가능 여부 및 현재 잔액 조회"""
        c1 = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_C1) or 0
        c2 = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_C2) or 0
        j = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_J) or 0
        m = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_M) or 0
        
        can_craft = c1 >= 1 and c2 >= 1 and j >= 1 and m >= 1
        
        return {
            "can_craft": can_craft,
            "collection": {
                "C1": int(c1),
                "C2": int(c2),
                "J": int(j),
                "M": int(m),
            },
            "required": {
                "C1": 1,
                "C2": 1,
                "J": 1,
                "M": 1,
            },
        }
