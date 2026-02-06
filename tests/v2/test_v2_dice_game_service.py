"""V2 Dice Game Service Tests.

Coverage Targets:
- Dice Game: Insufficient ticket / Success
- Status Check
- Golden Hour Logic (Integration)
"""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from sqlalchemy.orm import Session
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.models import V2User, UserGameWallet, GameTokenType
from app.v2.models.v2_dice import V2DiceConfig
from app.core.exceptions import NotEnoughTokensError

@pytest.fixture
def dice_user(db: Session):
    user = V2User(cc_id="dice_tester", nickname="dice_tester", role="USER")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def dice_config(db: Session):
    config = V2DiceConfig(
        name="TEST_DICE",
        ticket_type="DICE_TICKET",
        is_active=True,
        win_probability=0.4,
        draw_probability=0.1,
        lose_probability=0.5,
        win_reward_amount=100,
        draw_reward_amount=10,
        lose_reward_amount=0
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

class TestV2DiceGameService:
    
    def test_play_insufficient_ticket_raises(self, db: Session, dice_user, dice_config):
        """Should raise error if user has no tickets."""
        service = V2DiceGameService()
        
        # Ensure 0 balance
        wallet = db.query(UserGameWallet).filter_by(
            user_id=dice_user.id, token_type=GameTokenType.DICE_TICKET
        ).first()
        if wallet:
            wallet.balance = 0
            db.commit()

        with pytest.raises(NotEnoughTokensError):
            service.play(db, user_id=dice_user.id)

    def test_play_success_outcome(self, db: Session, dice_user, dice_config):
        """Should succeed if user has tickets."""
        service = V2DiceGameService()
        
        # Give 1 ticket
        db.merge(UserGameWallet(
            user_id=dice_user.id,
            token_type=GameTokenType.DICE_TICKET,
            balance=1
        ))
        db.commit()
        
        # Mock random to force outcome if needed, or just assert result structure
        # service._choose_outcome uses random.choices. We can patch it or just check result validity.
        with patch.object(service, "_choose_outcome", return_value="WIN"):
             res = service.play(db, user_id=dice_user.id)
             
             assert res.result == "OK"
             assert res.game.outcome == "WIN"
             assert res.game.reward_amount == 100
             
             # Verify ticket consumed
             wallet = db.query(UserGameWallet).filter_by(
                user_id=dice_user.id, token_type=GameTokenType.DICE_TICKET
             ).first()
             # Balance should be 0 (1 - 1)
             assert wallet.balance == 0

    def test_get_status_golden_hour(self, db: Session, dice_user, dice_config):
        """Status should reflect golden hour active state."""
        service = V2DiceGameService()
        
        # Mock golden hour Check
        with patch.object(service, "_is_golden_hour_active", return_value=True):
             status = service.get_status(db, user_id=dice_user.id)
             
             assert status.is_golden_hour is True
