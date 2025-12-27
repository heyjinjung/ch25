import pytest
from datetime import datetime
from sqlalchemy import select
from app.models.user import User
from app.models.vault2 import VaultProgram
from app.models.external_ranking import ExternalRankingData
from app.services.game_wallet_service import GameWalletService
from app.services.vault2_service import Vault2Service
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.schemas.external_ranking import ExternalRankingCreate
from app.models.game_wallet import GameTokenType

@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def admin_flow_user(db_session):
    # Unique ID for this test flow
    ext_id = "admin-flow-test-user-v2"
    user = db_session.query(User).filter(User.external_id == ext_id).one_or_none()
    if not user:
        # Create user if not exists
        user = User(external_id=ext_id, nickname="FlowTesterV2", level=1, xp=0)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

def test_admin_manager_flow(db_session, admin_flow_user):
    """
    Simulates the 'Admin Manager Experience Flow' at the service layer.
    """
    print(f"\n[TEST START] Admin Flow for user: {admin_flow_user.external_id} (ID: {admin_flow_user.id})")
    
    # --- SCENARIO 1: TICKET GRANT ---
    # Service: GameWalletService
    wallet_service = GameWalletService()
    
    # 1.1 Grant 10 Roulette Coins
    print("  > [Step 1] Granting 10 Roulette Coins...")
    
    # Check initial balance
    initial_bal = wallet_service.get_balance(db_session, admin_flow_user.id, GameTokenType.ROULETTE_COIN)
    
    # Grant
    new_bal = wallet_service.grant_tokens(
        db=db_session,
        user_id=admin_flow_user.id,
        token_type=GameTokenType.ROULETTE_COIN,
        amount=10,
        reason="ADMIN_TEST_GRANT"
    )
    
    assert new_bal == initial_bal + 10
    print(f"    - Success. Balance: {initial_bal} -> {new_bal}")

    # --- SCENARIO 2: VAULT OPERATIONS ---
    # Service: Vault2Service (Admin Eligibility)
    vault_service = Vault2Service()
    program_key = Vault2Service.DEFAULT_PROGRAM_KEY
    
    print("  > [Step 2] Updating Vault Eligibility...")
    
    # 2.1 Set Eligibility to True (Allowlist)
    vault_service.upsert_eligibility(
        db=db_session,
        program_key=program_key,
        user_id=admin_flow_user.id,
        eligible=True
    )
    
    # Verify
    is_eligible = vault_service.get_eligibility(
        db=db_session,
        program_key=program_key,
        user_id=admin_flow_user.id
    )
    
    assert is_eligible is True
    print("    - Eligibility set to TRUE verified.")
    
    # 2.2 Revert to previous state (optional, but good for cleanup/toggling test)
    # vault_service.upsert_eligibility(db_session, program_key=program_key, user_id=admin_flow_user.id, eligible=False)


    # --- SCENARIO 3: EXTERNAL RANKING ---
    # Service: AdminExternalRankingService
    ranking_service = AdminExternalRankingService()
    
    print("  > [Step 3] Injecting External Ranking Data...")
    
    ranking_payload = [
        ExternalRankingCreate(
            external_id=admin_flow_user.external_id,
            deposit_amount=50000,
            play_count=123,
            memo="Admin Flow Test Insert"
        )
    ]
    
    # Upsert
    results = ranking_service.upsert_many(db_session, ranking_payload)
    
    # Verify logic
    assert len(results) == 1
    row = results[0]
    assert row.user_id == admin_flow_user.id
    assert row.deposit_amount == 50000
    assert row.memo == "Admin Flow Test Insert"
    
    print(f"    - Ranking Data Saved: Deposit={row.deposit_amount}, Memo='{row.memo}'")

    print("[TEST END] Admin Manager Flow Verified Successfully.")

if __name__ == "__main__":
    pytest.main([__file__, "-s"])
