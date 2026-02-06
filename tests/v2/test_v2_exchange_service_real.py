"""V2 Exchange Service Tests.

Coverage Targets:
- Exchange Service: Puzzle craft success / Insufficient
"""
import pytest
from unittest.mock import MagicMock

from sqlalchemy.orm import Session
from app.v2.services.v2_exchange_service import V2ExchangeService
from app.v2.models import V2User, UserGameWallet, GameTokenType
from app.core.exceptions import NotEnoughTokensError

@pytest.fixture
def exchange_user(db: Session):
    user = V2User(cc_id="exch_tester", nickname="exch_tester", role="USER")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

class TestV2ExchangeServiceReal:
    
    def test_craft_puzzle_success(self, db: Session, exchange_user):
        """Should successfully craft if user has all pieces."""
        # Grant all 4 pieces
        pieces = [
            GameTokenType.PUZZLE_C1,
            GameTokenType.PUZZLE_C2,
            GameTokenType.PUZZLE_J,
            GameTokenType.PUZZLE_M
        ]
        for p in pieces:
            db.merge(UserGameWallet(user_id=exchange_user.id, token_type=p, balance=1))
        db.commit()
        
        res = V2ExchangeService.craft_puzzle_to_gold_key(db, user_id=exchange_user.id)
        
        assert res["result"] == "OK"
        assert res["reward_token"] == "GOLD_KEY_TICKET"
        assert res["reward_amount"] == 1
        
        # Verify consumed
        for p in pieces:
            w = db.query(UserGameWallet).filter_by(user_id=exchange_user.id, token_type=p).first()
            assert w.balance == 0

    def test_craft_puzzle_insufficient(self, db: Session, exchange_user):
        """Should raise error if any piece missing."""
        # Grant only 3 pieces
        pieces = [
            GameTokenType.PUZZLE_C1,
            GameTokenType.PUZZLE_C2,
            # Missing J
            GameTokenType.PUZZLE_M
        ]
        for p in pieces:
            db.merge(UserGameWallet(user_id=exchange_user.id, token_type=p, balance=1))
        db.commit()
        
        with pytest.raises(NotEnoughTokensError):
            V2ExchangeService.craft_puzzle_to_gold_key(db, user_id=exchange_user.id)
