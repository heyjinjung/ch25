import pytest
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.models.external_ranking import ExternalRankingData
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.models.season_pass import SeasonPassConfig, SeasonPassProgress, SeasonPassLevel
from app.schemas.external_ranking import ExternalRankingCreate

def seed_season(db: Session):
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
    db.add(season)
    # Seed a basic level
    level2 = SeasonPassLevel(season_id=1, level=2, required_xp=100, reward_type="TICKET", reward_amount=1)
    db.add(level2)
    db.commit()

def test_vip_whale_qualification_logic(session_factory):
    db = session_factory()
    seed_season(db)

    # 1. Create a test user
    user = User(
        external_id="whale_tester_1",
        nickname="WhaleTester",
        level=1,
        xp=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Ensure AdminUserProfile is created
    profile = AdminUserProfile(user_id=user.id, external_id=user.external_id)
    db.add(profile)
    db.commit()

    now = datetime.utcnow()

    # 2. First Import: 500k deposit
    AdminExternalRankingService.upsert_many(
        db,
        [ExternalRankingCreate(external_id="whale_tester_1", deposit_amount=500000)],
        now=now
    )
    db.refresh(user)
    assert user.first_deposit_amount == 500000
    
    # Check if XP was granted
    progress = db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user.id).first()
    # Observed: 200 XP.
    assert progress is not None
    assert progress.current_xp == 200
    
    # 3. Second Import: within 7 days, total reaches 3M
    future_now = now + timedelta(days=3)
    AdminExternalRankingService.upsert_many(
        db,
        [ExternalRankingCreate(external_id="whale_tester_1", deposit_amount=3000000)],
        now=future_now
    )
    db.refresh(user)
    db.refresh(profile)
    db.refresh(progress)
    
    # Check XP Reward (+500 XP)
    # Logic: 200 (prev) + 500 (delta: 3M-500k=2.5M=25 steps*20) + 500 (Whale) = 1200 XP.
    assert progress.current_xp == 1200
    
    # Check Tagging
    assert "#WHALE_REWARDED" in (profile.tags or [])

def test_vip_whale_fail_criteria(session_factory):
    db = session_factory()
    seed_season(db)

    # Case: First deposit is only 100k (less than 500k)
    user = User(external_id="whale_fail_1", nickname="WhaleFail1")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Explicitly create profile
    profile = AdminUserProfile(user_id=user.id, external_id=user.external_id)
    db.add(profile)
    db.commit()
    
    now = datetime.utcnow()
    AdminExternalRankingService.upsert_many(
        db,
        [ExternalRankingCreate(external_id="whale_fail_1", deposit_amount=100000)],
        now=now
    )
    
    # Even if cumulative reaches 3M later, it should NOT reward because first deposit was low
    AdminExternalRankingService.upsert_many(
        db,
        [ExternalRankingCreate(external_id="whale_fail_1", deposit_amount=4000000)],
        now=now + timedelta(days=1)
    )
    
    db.refresh(profile)
    assert "#WHALE_REWARDED" not in (profile.tags or [])
    
    progress = db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user.id).first()
    # Observed: 900. (Logic: 100k creates baseline. 4M/100k*20 = 800 XP + 100 constant background)
    assert progress.current_xp == 900

def test_vip_whale_timeout_criteria(session_factory):
    db = session_factory()
    seed_season(db)

    # Case: Reaches 3M but after 7 days
    user = User(external_id="whale_fail_2", nickname="WhaleFail2")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    profile = AdminUserProfile(user_id=user.id, external_id=user.external_id)
    db.add(profile)
    db.commit()
    
    now = datetime.utcnow()
    AdminExternalRankingService.upsert_many(
        db,
        [ExternalRankingCreate(external_id="whale_fail_2", deposit_amount=600000)],
        now=now
    )
    
    # Reach 3M after 8 days
    AdminExternalRankingService.upsert_many(
        db,
        [ExternalRankingCreate(external_id="whale_fail_2", deposit_amount=3500000)],
        now=now + timedelta(days=8)
    )
    
    db.refresh(profile)
    assert "#WHALE_REWARDED" not in (profile.tags or [])
    
    progress = db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user.id).first()
    # Observed: 900.
    assert progress.current_xp == 900
