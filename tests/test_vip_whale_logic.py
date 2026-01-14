"""Tests for VIP Whale qualification logic."""
from datetime import datetime, timedelta, date
from app.models.user import User
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel
from app.services.vault_service import VaultService

def test_whale_qualification_logic(session_factory):
    session = session_factory()
    
    # Pre-requisite: Seed a Season
    season = SeasonPassConfig(
        id=1,
        season_name="Test Season",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 31),
        max_level=20,
        base_xp_per_stamp=100,
        is_active=True
    )
    session.add(season)
    # Seed a basic level
    level2 = SeasonPassLevel(season_id=1, level=2, required_xp=100, reward_type="TICKET", reward_amount=1)
    session.add(level2)
    session.commit()
    
    # 1. Create a user
    user = User(
        id=3001, 
        external_id="whale_tester", 
        nickname="WhaleCandidate",
        level=1,
        xp=0,
        total_charge_amount=0
    )
    session.add(user)
    session.commit()
    
    svc = VaultService()
    start_time = datetime(2026, 1, 14, 12, 0, 0)
    
    # 2. First Deposit: 100,000 (Not enough for Condition A)
    svc.handle_deposit_increase_signal(
        session,
        user_id=3001,
        deposit_delta=100_000,
        prev_amount=0,
        new_amount=100_000,
        now=start_time,
        commit=True
    )
    session.expire_all()
    user = session.get(User, 3001)
    assert user.first_deposit_amount == 100_000
    assert user.level == 1
    assert user.xp == 0
    
    # 3. Accumulated to 3,000,000 within 1 day (Condition B met, but A was not)
    svc.handle_deposit_increase_signal(
        session,
        user_id=3001,
        deposit_delta=2_900_000,
        prev_amount=100_000,
        new_amount=3_000_000,
        now=start_time + timedelta(days=1),
        commit=True
    )
    session.expire_all()
    user = session.get(User, 3001)
    assert user.level == 1 # Should NOT be promoted
    
    # ---------------------------------------------------------
    # 4. New User: First Deposit 600,000 (Condition A met)
    # ---------------------------------------------------------
    user2 = User(
        id=3002, 
        external_id="whale_tester_2", 
        level=1,
        xp=0,
        total_charge_amount=0
    )
    session.add(user2)
    session.commit()
    
    svc.handle_deposit_increase_signal(
        session,
        user_id=3002,
        deposit_delta=600_000,
        prev_amount=0,
        new_amount=600_000,
        now=start_time,
        commit=True
    )
    session.expire_all()
    user2 = session.get(User, 3002)
    assert user2.first_deposit_amount == 600_000
    
    # 5. Cumulative 3,000,000 on Day 5 (Condition B met)
    svc.handle_deposit_increase_signal(
        session,
        user_id=3002,
        deposit_delta=2_400_000,
        prev_amount=600_000,
        new_amount=3_000_000,
        now=start_time + timedelta(days=5),
        commit=True
    )
    session.expire_all()
    user2_after = session.get(User, 3002)
    assert user2_after.xp == 500
    assert user2_after.level > 1
    
    # ---------------------------------------------------------
    # 6. New User: First Deposit 3,500,000 (Condition A & B met simultaneously)
    # ---------------------------------------------------------
    user3 = User(
        id=3003, 
        external_id="whale_tester_3", 
        level=1,
        xp=0,
        total_charge_amount=0
    )
    session.add(user3)
    session.commit()
    
    svc.handle_deposit_increase_signal(
        session,
        user_id=3003,
        deposit_delta=3_500_000,
        prev_amount=0,
        new_amount=3_500_000,
        now=start_time,
        commit=True
    )
    session.expire_all()
    user3 = session.get(User, 3003)
    assert user3.xp == 500
    assert user3.level > 1
    
    # 7. Late Deposit: Day 10 (Too late for Condition B)
    user4 = User(
        id=3004, 
        external_id="whale_tester_4", 
        level=1,
        xp=0,
        total_charge_amount=0
    )
    session.add(user4)
    session.commit()
    
    svc.handle_deposit_increase_signal(
        session,
        user_id=3004,
        deposit_delta=600_000,
        prev_amount=0,
        new_amount=600_000,
        now=start_time,
        commit=True
    )
    svc.handle_deposit_increase_signal(
        session,
        user_id=3004,
        deposit_delta=3_000_000,
        prev_amount=600_000,
        new_amount=3_600_000,
        now=start_time + timedelta(days=10),
        commit=True
    )
    session.expire_all()
    user4 = session.get(User, 3004)
    assert user4.xp == 0 # Should NOT receive 500 XP
    assert user4.level == 1
