import pytest
from datetime import datetime, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User
from app.models.external_ranking import ExternalRankingData
from app.models.user_activity import UserActivity
from app.models.admin_user_profile import AdminUserProfile
from app.models.season_pass import SeasonPassConfig # Needed for FKs if any
from app.schemas.cc_deposit import CCDepositCreate
from app.v2.services.admin_cc_deposit_service import AdminExternalRankingService

# Mock Settings
from unittest.mock import MagicMock, patch

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_cc_deposit_idempotency(db_session):
    """
    2-6. CC Deposit Idempotency:
    Verify that submitting the SAME total_deposit amount twice results in 0 delta 
    and NO duplicated events.
    """
    # 1. Setup User
    user = User(id=1, nickname="tester", external_id="ext_01")
    db_session.add(user)
    db_session.commit()

    # 2. First Deposit: 100,000
    payload = CCDepositCreate(
        user_id=1,
        cc_id="ext_01",
        deposit_amount=100_000,
        play_count=10,
        memo="First"
    )
    
    # We patch internal services to track calls
    with patch("app.v2.services.admin_cc_deposit_service.V2VaultService") as MockVaultService, \
         patch("app.v2.services.admin_cc_deposit_service.SeasonPassService") as MockSeasonService, \
         patch("app.v2.services.admin_cc_deposit_service.LevelXPService") as MockXPService, \
         patch("app.v2.services.admin_cc_deposit_service.get_settings") as MockSettings:
        
        # Configure Mocks
        MockSeasonService.return_value.get_current_season.return_value = None
        # Ensure settings return valid ints
        MockSettings.return_value.external_ranking_deposit_step_amount = 100000
        MockSettings.return_value.external_ranking_deposit_xp_per_step = 20
        MockSettings.return_value.external_ranking_deposit_max_steps_per_day = 50
        MockSettings.return_value.external_ranking_deposit_cooldown_minutes = 0
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.test_mode = False
        
        # Act 1
        AdminExternalRankingService.upsert_many(db_session, [payload])
        
        # Verify 1: Delta should be 100,000
        # Check logic: The service calls vault_service.handle_deposit_increase_signal
        assert MockVaultService.return_value.handle_deposit_increase_signal.called
        call_args = MockVaultService.return_value.handle_deposit_increase_signal.call_args[1]
        assert call_args["deposit_delta"] == 100_000
        assert call_args["prev_amount"] == 0
        assert call_args["new_amount"] == 100_000

        # Reset mocks
        MockVaultService.return_value.handle_deposit_increase_signal.reset_mock()

        # Act 2: Same Payload (Idempotency)
        AdminExternalRankingService.upsert_many(db_session, [payload])

        # Verify 2: Should NOT call vault signal
        assert not MockVaultService.return_value.handle_deposit_increase_signal.called
        
        # Verify DB state is unchanged
        row = db_session.query(ExternalRankingData).filter_by(user_id=1).first()
        assert row.deposit_amount == 100_000


def test_cc_deposit_delta_logic(db_session):
    """
    2-6. CC Deposit Delta:
    Verify that increasing total_deposit correctly calculates the delta.
    """
    user = User(id=2, nickname="delta_tester", external_id="ext_02")
    db_session.add(user)
    db_session.commit()

    # Initial State: 100,000
    AdminExternalRankingService.upsert_many(db_session, [
        CCDepositCreate(user_id=2, cc_id="ext_02", deposit_amount=100_000, play_count=10)
    ])

    # New State: 150,000 (Delta +50,000)
    payload_update = CCDepositCreate(
        user_id=2, 
        cc_id="ext_02", 
        deposit_amount=150_000, 
        play_count=15
    )

    with patch("app.v2.services.admin_cc_deposit_service.V2VaultService") as MockVaultService, \
         patch("app.v2.services.admin_cc_deposit_service.SeasonPassService") as MockSeasonService, \
         patch("app.v2.services.admin_cc_deposit_service.get_settings") as MockSettings:

        # Configure Mocks
        MockSeasonService.return_value.get_current_season.return_value = None
        # Ensure settings return valid ints
        MockSettings.return_value.external_ranking_deposit_step_amount = 100000
        MockSettings.return_value.external_ranking_deposit_xp_per_step = 20
        MockSettings.return_value.external_ranking_deposit_max_steps_per_day = 50
        MockSettings.return_value.external_ranking_deposit_cooldown_minutes = 0
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.test_mode = False
         
        AdminExternalRankingService.upsert_many(db_session, [payload_update])

        # Verify Delta
        assert MockVaultService.return_value.handle_deposit_increase_signal.called
        call_args = MockVaultService.return_value.handle_deposit_increase_signal.call_args[1]
        assert call_args["deposit_delta"] == 50_000  # 150k - 100k
        assert call_args["prev_amount"] == 100_000
        assert call_args["new_amount"] == 150_000


def test_first_deposit_trigger(db_session):
    """
    2-6. New User / First Deposit Check:
    Verify first_deposit_at is set on the very first external deposit.
    """
    user = User(id=3, nickname="newbie", external_id="ext_03")
    db_session.add(user)
    db_session.commit()

    assert user.first_deposit_at is None

    payload = CCDepositCreate(user_id=3, cc_id="ext_03", deposit_amount=50_000, play_count=0)
    
    # We need to mock 'send_ops_notification' inside _check_whale_qualification to avoid errors
    with patch("app.core.notifications.send_ops_notification"): 
        AdminExternalRankingService.upsert_many(db_session, [payload])

    db_session.refresh(user)
    assert user.first_deposit_at is not None
    assert user.first_deposit_amount == 50_000
