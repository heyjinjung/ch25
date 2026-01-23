
import os
import sys
import json
import uuid
import random
from datetime import datetime, date
from sqlalchemy import select, func, update, or_
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Ensure current directory is in PYTHONPATH
sys.path.append(os.getcwd())

from app.api.deps import get_db
from app.main import app as fastapi_app
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType
from app.v2.api.deps import get_current_user_id
from app.v2.models.user import V2User
from app.v2.models.v2_dice import V2DiceConfig, V2DiceLog
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize, V2LotteryLog
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment, V2RouletteLog
from app.v2.services.user_service import V2UserService
from app.models.user import User
from app.models.user_segment import UserSegment
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.vault2_service import Vault2Service
from app.v2.services.mission_service import V2MissionService

from tests.v2_tests.phase3_game.test_game_engine_smoke import (
    _ensure_feature_config,
    _seed_v2_user,
    _seed_dice_config,
    _seed_lottery_config,
    _seed_roulette_config
)

def print_banner(title):
    print(f"\n{'='*20} {title} {'='*20}")

def verify_advanced_logic():
    # Setup Engine
    from sqlalchemy import create_engine
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    from app.db.base_class import Base
    import app.db.base
    import app.v2.db.base
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    db = SessionLocal()
    
    def override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = override_get_db
    client = TestClient(fastapi_app)

    # Mock Settings to disable test_mode logic in InventoryService
    from app.core import config as app_core_config
    class MockSettings:
        test_mode = False
        streak_day_reset_hour_kst = 9
        golden_hour_enabled = True
        ch25_intervention_enabled = False
        ch25_dda_enabled = False
        ch25_internal_stream_enabled = False
        dice_bet_value = 1000
        enable_vault_game_earn_events = True
        vault_accrual_multiplier_enabled = False
        timezone = "Asia/Seoul"
        streak_multiplier_enabled = True
        streak_hot_threshold_days = 3
        streak_legend_threshold_days = 7
        streak_hot_multiplier = 1.2
        streak_legend_multiplier = 1.5
    
    import app.core.config
    import app.v2.services.inventory_service
    import app.v2.services.v2_roulette_game_service
    import app.v2.services.v2_dice_game_service
    import app.v2.services.v2_lottery_game_service
    import app.v2.services.mission_service

    app.core.config.get_settings = lambda: MockSettings()
    app.v2.services.inventory_service.get_settings = lambda: MockSettings()
    app.v2.services.v2_roulette_game_service.get_settings = lambda: MockSettings()
    app.v2.services.v2_dice_game_service.get_settings = lambda: MockSettings()
    app.v2.services.v2_lottery_game_service.get_settings = lambda: MockSettings()
    app.v2.services.mission_service.get_settings = lambda: MockSettings()

    # 1. Seeding
    print_banner("1. Seeding Base Environment")
    for feature in (FeatureType.ROULETTE, FeatureType.DICE, FeatureType.LOTTERY):
        _ensure_feature_config(db, feature)

    v2_user = _seed_v2_user(db)
    legacy_user_id = V2UserService.ensure_legacy_user_id(db, v2_user.id)
    print(f"User V2 ID: {v2_user.id}, Legacy ID: {legacy_user_id}")
    
    fastapi_app.dependency_overrides[get_current_user_id] = lambda: int(v2_user.id)

    # 2. Ticket Alias & Fallback (Roulette)
    print_banner("2. Ticket Alias & Fallback (Roulette)")
    # ROULETTE_TICKET (v2 name) aliases to ROULETTE_COIN (v1 name)
    # Grant ONLY legacy name
    V2InventoryService.grant_wallet_tokens(db, v2_user.id, GameTokenType.ROULETTE_COIN, 10, reason="LEGACY_TEST")
    db.commit()
    
    _seed_roulette_config(db) # Defaults to ROULETTE_TICKET
    
    def print_all_balances():
        from app.v2.models import UserGameWallet
        wallets = db.execute(select(UserGameWallet).where(UserGameWallet.user_id == legacy_user_id)).scalars().all()
        for w in wallets:
            print(f"  Wallet {w.token_type.value}: {w.balance}")

    print("Balances Before:")
    print_all_balances()

    # Request /play (should fall back to COIN)
    r = client.post("/api/v2/roulette/play")
    print(f"Roulette Play Status: {r.status_code}")
    if r.status_code == 200:
        print("Balances After:")
        print_all_balances()
        balance_after = V2InventoryService.get_wallet_balance(db, v2_user.id, GameTokenType.ROULETTE_COIN)
        assert balance_after == 10 - 1
        print("Success: Legacy ticket alias fallback works.")
    else:
        print(f"Error: {r.text}")

    # 3. Lottery Stock Management
    print_banner("3. Lottery Stock Management")
    l_config = _seed_lottery_config(db)
    # Clear default prizes and add one with stock=1
    db.query(V2LotteryPrize).filter(V2LotteryPrize.config_id == l_config.id).delete()
    p1 = V2LotteryPrize(config_id=l_config.id, label="RARE_CAR", reward_type="POINT", reward_amount=1000, weight=9999, stock=1)
    p2 = V2LotteryPrize(config_id=l_config.id, label="NORMAL_DUST", reward_type="POINT", reward_amount=1, weight=1, stock=None)
    db.add_all([p1, p2])
    db.commit()

    V2InventoryService.grant_wallet_tokens(db, v2_user.id, GameTokenType.LOTTERY_TICKET, 10, reason="STOCK_TEST")
    db.commit()

    # Play 1: Should get RARE_CAR
    r = client.post("/api/v2/lottery/play")
    data = r.json()
    print(f"Play 1 Prize: {data['prize']['label']}")
    assert data['prize']['label'] == "RARE_CAR"
    db.refresh(p1)
    print(f"RARE_CAR Stock After Play 1: {p1.stock}")
    assert p1.stock == 0

    # Play 2: Should get NORMAL_DUST (RARE_CAR is OOS)
    r = client.post("/api/v2/lottery/play")
    data = r.json()
    print(f"Play 2 Prize: {data['prize']['label']}")
    assert data['prize']['label'] == "NORMAL_DUST"
    print("Success: Lottery stock exhaustion works.")

    # 4. Puzzle Collection Inventory
    print_banner("4. Puzzle Collection Inventory")
    l_config.puzzle_piece_probability = 1.0 # 100% drop
    db.commit()

    r = client.post("/api/v2/lottery/play")
    data = r.json()
    piece = data['game_data']['collection_piece']
    print(f"Puzzle Piece Received: {piece}")
    
    token_type = GameTokenType(f"PUZZLE_{piece}")
    count = V2InventoryService.get_wallet_balance(db, v2_user.id, token_type)
    print(f"Wallet Balance for {token_type.value}: {count}")
    assert count >= 1
    print("Success: Puzzle piece accurately granted to v2_inventory.")

    # 5. Mission Linkage & Streak
    print_banner("5. Mission Linkage & Streak")
    # Seed a mission for PLAY_GAME
    mission = Mission(
        title="Just Play Once",
        description="Play any game",
        category=MissionCategory.DAILY,
        action_type="PLAY_GAME",
        logic_key="p3_test_play_once",
        target_value=1,
        reward_type=MissionRewardType.POINT,
        reward_amount=100,
        is_active=True,
        auto_claim=False
    )
    db.add(mission)
    db.commit()
    
    _seed_dice_config(db)
    V2InventoryService.grant_wallet_tokens(db, v2_user.id, GameTokenType.DICE_TICKET, 10, reason="MISSION_TEST")
    db.commit()

    # Play Dice
    print("Playing Dice to trigger mission...")
    r = client.post("/api/v2/dice/play")
    print(f"Dice Play Status: {r.status_code}")
    
    # Check Mission Progress
    progress = db.execute(
        select(UserMissionProgress).where(
            UserMissionProgress.user_id == v2_user.id,
            UserMissionProgress.mission_id == mission.id
        )
    ).scalars().first()
    
    print(f"Mission Progress: {progress.current_value}/{mission.target_value}, Completed: {progress.is_completed}")
    assert progress.is_completed == True
    
    # Check User Streak
    u = db.get(User, legacy_user_id)
    print(f"User Play Streak: {u.play_streak}")
    assert u.play_streak == 1
    print("Success: Game play correctly triggers V2 Mission & Streak logic.")

    # Cleanup
    fastapi_app.dependency_overrides.clear()
    db.close()
    engine.dispose()

if __name__ == "__main__":
    verify_advanced_logic()
