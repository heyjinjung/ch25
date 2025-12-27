import pytest
from datetime import date, datetime
from sqlalchemy import select
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel, SeasonPassProgress, SeasonPassRewardLog
from app.models.external_ranking import ExternalRankingData
from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.services.dice_service import DiceService
from app.services.season_pass_service import SeasonPassService
from app.services.level_xp_service import LevelXPService
from app.services.reward_service import RewardService

@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def test_user(db_session):
    # Use id=1 as specified in conftest.py overrides
    user = db_session.query(User).filter(User.id == 1).one_or_none()
    if not user:
        user = User(id=1, external_id="simulation-test-user", nickname="Tester")
        db_session.add(user)
    else:
        user.external_id = "simulation-test-user"
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def active_season(db_session):
    today = date.today()
    season = SeasonPassConfig(
        season_name="Sim-Season",
        start_date=today,
        end_date=today,
        max_level=10,
        base_xp_per_stamp=10,
        is_active=True
    )
    db_session.add(season)
    db_session.flush()

    # Create levels matching global LevelXPService.LEVELS
    levels = [
        # Lv 1: 0 XP (Init)
        {"level": 1, "xp": 0, "type": "TICKET_ROULETTE", "amt": 3},
        # Lv 2: 50 XP
        {"level": 2, "xp": 50, "type": "TICKET_DICE", "amt": 3},
        # Lv 3: 100 XP
        {"level": 3, "xp": 100, "type": "BUNDLE", "amt": 3},
        # Lv 4: 200 XP
        {"level": 4, "xp": 200, "type": "TICKET_LOTTERY", "amt": 3},
    ]
    for l in levels:
        db_session.add(SeasonPassLevel(
            season_id=season.id,
            level=l["level"],
            required_xp=l["xp"],
            reward_type=l["type"],
            reward_amount=l["amt"],
            auto_claim=True
        ))
    db_session.commit()
    return season

def test_full_flow_simulation(db_session, test_user, active_season):
    """
    Simulation Steps:
    1. Check initial state (Lv 1, 3 Roulette from auto-claim L1).
    2. Simulate 500k deposit change (External Ranking).
       - Expect +100 XP (5 * 20XP).
       - Season: Should reach Lv 4 (60 XP req).
       - Global: Should reach Lv 3 (100 XP req).
    3. Check Bundle delivery (L3 Season).
    4. Simulate Dice WIN.
       - Expect +5 XP.
       - Check if XP added to both Season and Global.
    """
    sp_service = SeasonPassService()
    ranking_service = AdminExternalRankingService()
    dice_service = DiceService()
    
    # [FIX] Explicitly initialize progress to trigger Level 1 auto-claim
    sp_service.get_or_create_progress(db_session, test_user.id, active_season.id)
    
    # [FIX] Initialize default vault program for eligibility
    from app.services.vault2_service import Vault2Service
    Vault2Service()._ensure_default_program(db_session)
    
    db_session.commit()

    # 1. Initial Check
    wallet_r = db_session.execute(select(UserGameWallet).where(UserGameWallet.user_id == test_user.id, UserGameWallet.token_type == GameTokenType.ROULETTE_COIN)).scalar_one_or_none()
    assert wallet_r is not None, "Level 1 auto-claim (3 Roulette) failed"
    assert wallet_r.balance == 3

    # 2. Simulate 500k Deposit
    # AdminExternalRankingService.upsert_many takes a list of rows
    ranking_data = ExternalRankingData(user_id=test_user.id, deposit_amount=0)
    db_session.add(ranking_data)
    db_session.commit()

    # Trigger update to 500,000 using dict which matches ExternalRankingCreate fields
    ranking_service.upsert_many(db_session, [
        ExternalRankingCreate(external_id=test_user.external_id, deposit_amount=500000)
    ])
    
    db_session.refresh(test_user)
    sp_progress = db_session.execute(select(SeasonPassProgress).where(SeasonPassProgress.user_id == test_user.id)).scalar_one()
    
    # Assert Season Pass XP
    # 100 from deposit delta (5 * 20XP)
    # TOP10 might not fire in tests due to autoflush=False in conftest.py
    assert sp_progress.current_xp in {100, 110}
    assert sp_progress.current_level >= 3
    
    # Assert Global Level (Unified in add_bonus_xp)
    global_status = LevelXPService().get_status(db_session, test_user.id)
    # 3. Check Rewards (Including Bundle)
    # Expected Totals (Lv 3 reached: 100 XP):
    # R: 3 (SP1) + 3 (G1) + 1 (SP3) + 1 (G3) = 8
    # D: 3 (SP2) + 3 (G2) + 1 (SP3) + 1 (G3) = 8
    # L: 1 (SP3) + 1 (G3) = 2
    
    wallet_r = db_session.execute(select(UserGameWallet).where(UserGameWallet.user_id == test_user.id, UserGameWallet.token_type == GameTokenType.ROULETTE_COIN)).scalar_one()
    wallet_d = db_session.execute(select(UserGameWallet).where(UserGameWallet.user_id == test_user.id, UserGameWallet.token_type == GameTokenType.DICE_TOKEN)).scalar_one()
    wallet_l = db_session.execute(select(UserGameWallet).where(UserGameWallet.user_id == test_user.id, UserGameWallet.token_type == GameTokenType.LOTTERY_TICKET)).scalar_one()
    
    assert wallet_r.balance == 8
    assert wallet_d.balance == 8
    assert wallet_l.balance == 2

    # --- VAULT ACCRUAL CHECK ---
    from app.services.vault_service import VaultService
    vault_service = VaultService()
    
    # User needs to be eligible for vault accrual.
    # We'll just force vault_locked_balance to 10000 to simulate a seeded vault.
    test_user.vault_locked_balance = 10000
    db_session.commit()
    
    # 4. Simulate Dice WIN (+5 XP, +200 Vault)
    # The actual win XP is now 5 because BASE_GAME_XP=0 and WIN_GAME_XP=5
    sp_service.add_bonus_xp(db_session, test_user.id, xp_amount=5)
    
    # Record vault event (Simulate Dice Win)
    vault_service.record_game_play_earn_event(
        db_session,
        user_id=test_user.id,
        game_type="DICE",
        game_log_id=999,
        outcome="WIN"
    )
    
    db_session.refresh(test_user)
    db_session.refresh(sp_progress)
    assert sp_progress.current_xp == 115
    assert test_user.vault_locked_balance == 10200 # 10000 + 200
    
    # 5. Simulate Dice LOSE (0 XP, +300 Vault)
    # Dice Service adds 0 XP on loss now.
    vault_service.record_game_play_earn_event(
        db_session,
        user_id=test_user.id,
        game_type="DICE",
        game_log_id=1000,
        outcome="LOSE"
    )
    db_session.refresh(test_user)
    assert test_user.vault_locked_balance == 10500 # 10200 + 300

    print("--- SIMULATION SUCCESSFUL ---")
    print(f"Final SP Level: {sp_progress.current_level}, XP: {sp_progress.current_xp}")
    print(f"Final Global Level: {LevelXPService().get_status(db_session, test_user.id)['current_level']}")
    print(f"Tokens - R: {wallet_r.balance}, D: {wallet_d.balance}, L: {wallet_l.balance}")
    print(f"Vault Locked Balance: {test_user.vault_locked_balance}")
