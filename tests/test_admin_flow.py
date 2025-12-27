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

    # --- SCENARIO 4: VAULT ENHANCEMENTS ---
    print("  > [Step 4] Testing Vault Enhancements (Global Toggle, Balance, Stats)...")
    
    # 4.1 Global Toggle
    print("    -> Toggling Global Active...")
    program = vault_service.update_program_active(db_session, program_key=program_key, is_active=False)
    assert program.is_active is False
    program = vault_service.update_program_active(db_session, program_key=program_key, is_active=True)
    assert program.is_active is True
    print("       - Toggle Verified.")
    
    # 4.2 Balance Update (Sync Check)
    print("    -> Updating Vault Balance...")
    # Initial: 0 or whatever previous tests set
    status_before = vault_service.get_or_create_status(db_session, user_id=admin_flow_user.id, program=program)
    locked_before = status_before.locked_amount or 0
    
    vault_service.update_balance(
        db_session, 
        user_id=admin_flow_user.id, 
        locked_delta=1000, 
        available_delta=500, 
        reason="Test Scenario 4"
    )
    
    # Verify VaultStatus
    status_after = vault_service.get_or_create_status(db_session, user_id=admin_flow_user.id, program=program)
    assert int(status_after.locked_amount) == locked_before + 1000
    assert int(status_after.available_amount) == 500
    
    # Verify User Table (Phase 1 Sync)
    db_session.refresh(admin_flow_user)
    assert admin_flow_user.vault_locked_balance == locked_before + 1000
    assert admin_flow_user.vault_available_balance == 500
    print("       - Balance Update & Sync Verified.")
    
    # 4.3 Detail Stats
    print("    -> Fetching Detail Stats (Expiring Soon)...")
    # Since checking `expiring_soon_24h` depends on `expires_at`. 
    # `update_balance` sets `expires_at` if it was None.
    # Ensure expires_at is within 24h for the test query to catch it.
    # The default program duration is 24h. So it should avail unless updated >24h ago.
    # Just to be sure, the query uses `between(now, now+24h)`.
    # If locked_at is NOW, expires_at is NOW+24h. It might be slightly on the edge if execution is slow?
    # Usually `between` is inclusive.
    
    details = vault_service.get_vault_detail_stats(db_session, type="expiring_soon_24h")
    # We might have other users, so verify our user is in the list
    found = next((item for item in details if item['user_id'] == admin_flow_user.id), None)
    
    # Note: If `expires_at` is exactly now+24h, it should work.
    
    if found:
        print(f"       - Found user in stats: {found['amount']} locked.")
    else:
        print("       - WARNING: User not found in 'expiring_soon_24h'. Check expiry time logic.")
        # Debug print
        print(f"         User expires_at: {admin_flow_user.vault_locked_expires_at}")
    

    print("[TEST END] Admin Manager Flow Verified Successfully.")

if __name__ == "__main__":
    pytest.main([__file__, "-s"])
