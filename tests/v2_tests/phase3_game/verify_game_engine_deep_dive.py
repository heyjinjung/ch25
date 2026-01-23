
import os
import sys
import json
import uuid
import random
from datetime import datetime, date
from sqlalchemy import select, func, update
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Ensure current directory is in PYTHONPATH
sys.path.append(os.getcwd())

from app.api.deps import get_db
from app.main import app as fastapi_app
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
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

from tests.v2_tests.phase3_game.test_game_engine_smoke import (
    _ensure_feature_config,
    _seed_v2_user,
    _seed_dice_config,
    _seed_lottery_config
)

def print_banner(title):
    print(f"\n{'='*20} {title} {'='*20}")

def verify_deep_dive():
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
        vault_accrual_multiplier_enabled = False # Use DB Golden Hour instead
        timezone = "Asia/Seoul"
    
    app_core_config.get_settings = lambda: MockSettings()

    # 1. Seeding
    print_banner("1. Seeding Base Environment")
    for feature in (FeatureType.ROULETTE, FeatureType.DICE, FeatureType.LOTTERY):
        _ensure_feature_config(db, feature)

    v2_user = _seed_v2_user(db)
    legacy_user_id = V2UserService.ensure_legacy_user_id(db, v2_user.id)
    print(f"User V2 ID: {v2_user.id}, Legacy ID: {legacy_user_id}")

    # Set user segment to WHALE
    segment = UserSegment(user_id=legacy_user_id, segment="WHALE")
    db.add(segment)
    db.commit()

    # 2. Roulette Deep Dive (Grade & Ticket Mapping)
    print_banner("2. Roulette Deep Dive: Grade & Ticket Mapping")
    
    # Seed 4 types of Roulette configs
    grades = ["COMMON", "VIP", "WHALE", "AT_RISK"]
    ticket_types = ["ROULETTE_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET", "TRIAL_TICKET"]
    
    for i, g in enumerate(grades):
        t = ticket_types[i]
        config = V2RouletteConfig(name=f"Roulette {g}", ticket_type=t, grade=g, is_active=True)
        db.add(config)
        db.flush()
        for s in range(6):
            db.add(V2RouletteSegment(config_id=config.id, slot_index=s, label=f"{g} Slot {s}", weight=1, reward_type="POINT", reward_amount=200)) # Use 200 for GH gate
    
    db.commit()

    fastapi_app.dependency_overrides[get_current_user_id] = lambda: int(v2_user.id)
    
    V2InventoryService.grant_wallet_tokens(db, v2_user.id, GameTokenType.DIAMOND_TICKET, 10, reason="TEST")
    db.commit()

    balance_before = V2InventoryService.get_wallet_balance(db, v2_user.id, GameTokenType.DIAMOND_TICKET)
    print(f"Diamond Ticket Balance Before: {balance_before}")

    # Request with DIAMOND_TICKET in JSON Payload
    r = client.post("/api/v2/roulette/play", json={"ticket_type": "DIAMOND_TICKET"})
    print(f"Roulette Play (WHALE/DIAMOND) Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Chosen Segment: {data['segment']['label']}")
        balance_after = V2InventoryService.get_wallet_balance(db, v2_user.id, GameTokenType.DIAMOND_TICKET)
        print(f"Diamond Ticket Balance After: {balance_after}")
        assert balance_after == balance_before - 1
        assert "WHALE" in data['segment']['label']
    else:
        print(f"Error: {r.text}")

    # 3. Dice Deep Dive (Admin Config & Golden Hour)
    print_banner("3. Dice Deep Dive: Admin Config & Golden Hour")
    
    # Seed Dice Config properly
    dice_config = _seed_dice_config(db)
    
    # Configure Golden Hour in Vault2
    v2s2 = Vault2Service()
    v2s2.set_config_value(db, "golden_hour_config", {
        "enabled": True,
        "multiplier": 3.5,
        "manual_override": "FORCE_ON"
    })
    
    # Overwrite dice config to GUARANTEE WIN and match GH Gate (200)
    dice_config.win_probability = 1.0 # Force win
    dice_config.draw_probability = 0.0
    dice_config.lose_probability = 0.0
    dice_config.win_reward_amount = 200
    dice_config.win_reward_type = "POINT"
    db.commit()
    
    V2InventoryService.grant_wallet_tokens(db, v2_user.id, GameTokenType.DICE_TICKET, 10, reason="TEST")
    db.commit()

    r = client.post("/api/v2/dice/play")
    print(f"Dice Play Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Outcome: {data['game_data']['outcome']}, Base Reward: {data['game_data']['reward_amount']}")
        print(f"Vault Earn (with 3.5x Golden Hour): {data['vault_earn']}")
        # Expect 200 * 3.5 = 700
        assert data['vault_earn'] == 700
    
    # 4. Lottery Deep Dive (Puzzle Pieces)
    print_banner("4. Lottery Deep Dive: Puzzle Pieces")
    
    # Seed lottery properly
    l_config = _seed_lottery_config(db)
    l_config.puzzle_piece_probability = 1.0 # 100% drop
    
    # Ensure standard reward is 200 for GH if we wanted to test GH here too
    for p in l_config.prizes:
        p.reward_type = "POINT"
        p.reward_amount = 200
    
    db.commit()
    
    V2InventoryService.grant_wallet_tokens(db, v2_user.id, GameTokenType.LOTTERY_TICKET, 10, reason="TEST")
    db.commit()

    r = client.post("/api/v2/lottery/play")
    print(f"Lottery Play Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        piece = data['game_data']['collection_piece']
        print(f"Puzzle Piece Received: {piece}")
        print(f"Vault Earn: {data['vault_earn']}")
        assert piece in ["C", "J", "M"]
        # Lottery GH multiplier:
        # Note: Lottery is NOT in allowed_amounts currently unless it hits the 200 gate
        # Since I set reward to 200, it should hit the default gate {200, -50}
        assert data['vault_earn'] == 700

    # Cleanup
    fastapi_app.dependency_overrides.clear()
    db.close()
    engine.dispose()

if __name__ == "__main__":
    verify_deep_dive()
