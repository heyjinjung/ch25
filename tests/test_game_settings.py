import pytest
from datetime import date
from sqlalchemy import select
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.services.roulette_service import RouletteService
from app.services.dice_service import DiceService
from app.services.lottery_service import LotteryService

@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def test_user(db_session):
    user = db_session.query(User).filter(User.external_id == "admin-test-user").one_or_none()
    if not user:
        user = User(external_id="admin-test-user", nickname="AdminTester", level=1, xp=0)
        db_session.add(user)
    else:
        user.nickname = "AdminTester"
    db_session.commit()
    db_session.refresh(user)
    return user

def ensure_balance(db_session, user_id, token_type, amount):
    wallet = db_session.execute(
        select(UserGameWallet).where(UserGameWallet.user_id == user_id, UserGameWallet.token_type == token_type)
    ).scalar_one_or_none()
    if not wallet:
        wallet = UserGameWallet(user_id=user_id, token_type=token_type, balance=amount)
        db_session.add(wallet)
    else:
        wallet.balance = amount
    db_session.commit()

def test_game_settings_and_play(db_session, test_user):
    """
    Verifies that Roulette, Dice, and Lottery services are configured correctly 
    and can handle a play request (checking reward logic).
    """
    today = date.today()
    
    # 1. Roulette Test
    print("\n[TEST] Testing Roulette...")
    roulette_service = RouletteService()
    # Ensure config exists
    config_r = roulette_service._get_today_config(db_session)
    assert config_r is not None
    assert config_r.is_active is True
    print(f"  - Config '{config_r.name}' found.")
    
    # Ensure balance and play
    ensure_balance(db_session, test_user.id, GameTokenType.ROULETTE_COIN, 10)
    res_r = roulette_service.play(db_session, test_user.id, today)
    assert res_r.result == "OK"
    assert res_r.segment is not None
    print(f"  - Play successful. Reward: {res_r.segment.label} ({res_r.segment.reward_amount})")

    # 2. Dice Test
    print("\n[TEST] Testing Dice...")
    dice_service = DiceService()
    # Ensure config exists
    config_d = dice_service._get_today_config(db_session)
    assert config_d is not None
    print(f"  - Config '{config_d.name}' found.")
    
    # Ensure balance and play
    ensure_balance(db_session, test_user.id, GameTokenType.DICE_TOKEN, 10)
    res_d = dice_service.play(db_session, test_user.id, today)
    assert res_d.result == "OK"
    assert res_d.game.outcome in ["WIN", "LOSE", "DRAW"]
    print(f"  - Play successful. Outcome: {res_d.game.outcome}, Reward: {res_d.game.reward_amount}")

    # 3. Lottery Test
    print("\n[TEST] Testing Lottery...")
    lottery_service = LotteryService()
    # Ensure config exists
    config_l = lottery_service._get_today_config(db_session)
    assert config_l is not None
    print(f"  - Config '{config_l.name}' found.")
    
    # Ensure balance and play
    ensure_balance(db_session, test_user.id, GameTokenType.LOTTERY_TICKET, 10)
    res_l = lottery_service.play(db_session, test_user.id, today)
    assert res_l.result == "OK"
    assert res_l.prize is not None
    print(f"  - Play successful. Prize: {res_l.prize.label}")

if __name__ == "__main__":
    pytest.main([__file__, "-s"])
