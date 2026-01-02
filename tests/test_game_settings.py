import pytest
from datetime import date
from sqlalchemy import select
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.feature import FeatureConfig, FeatureType
from app.models.dice import DiceConfig
from app.models.lottery import LotteryConfig, LotteryPrize
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


def ensure_feature_config(db_session, feature_type: FeatureType, title: str, page_path: str):
    existing = db_session.execute(
        select(FeatureConfig).where(FeatureConfig.feature_type == feature_type)
    ).scalar_one_or_none()
    if existing is None:
        db_session.add(
            FeatureConfig(
                feature_type=feature_type,
                title=title,
                page_path=page_path,
                is_enabled=True,
                config_json={},
            )
        )
        db_session.commit()


def ensure_dice_config(db_session):
    existing = db_session.execute(select(DiceConfig).where(DiceConfig.is_active.is_(True))).scalar_one_or_none()
    if existing is None:
        db_session.add(
            DiceConfig(
                name="Test Dice",
                is_active=True,
                max_daily_plays=0,
                win_reward_type="NONE",
                win_reward_amount=0,
                draw_reward_type="NONE",
                draw_reward_amount=0,
                lose_reward_type="NONE",
                lose_reward_amount=0,
            )
        )
        db_session.commit()


def ensure_lottery_config(db_session):
    existing = db_session.execute(select(LotteryConfig).where(LotteryConfig.is_active.is_(True))).scalar_one_or_none()
    if existing is None:
        config = LotteryConfig(
            name="Test Lottery",
            is_active=True,
            max_daily_tickets=0,
        )
        db_session.add(config)
        db_session.flush()
        db_session.add(
            LotteryPrize(
                config_id=config.id,
                label="Test Prize",
                reward_type="NONE",
                reward_amount=0,
                weight=1,
                stock=None,
                is_active=True,
            )
        )
        db_session.commit()

def test_game_settings_and_play(db_session, test_user):
    """
    Verifies that Roulette, Dice, and Lottery services are configured correctly 
    and can handle a play request (checking reward logic).
    """
    today = date.today()

    # FeatureService.validate_feature_active()는 FeatureConfig가 없으면 404를 내므로 테스트에서 기본 시드
    ensure_feature_config(db_session, FeatureType.ROULETTE, "Roulette", "/roulette")
    ensure_feature_config(db_session, FeatureType.DICE, "Dice", "/dice")
    ensure_feature_config(db_session, FeatureType.LOTTERY, "Lottery", "/lottery")
    # DiceService는 DiceConfig가 없으면 500(DICE_CONFIG_MISSING)
    ensure_dice_config(db_session)
    # LotteryService는 LotteryConfig/Prize가 없으면 500(LOTTERY_CONFIG_MISSING)
    ensure_lottery_config(db_session)
    
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
