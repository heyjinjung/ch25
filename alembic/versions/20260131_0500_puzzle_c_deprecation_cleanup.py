"""Deprecate PUZZLE_C and normalize puzzle tokens to C1/C2/J/M

Revision ID: 20260131_0500_puzzle_c_deprecation_cleanup
Revises: 20260131_0400_fix_remaining_fk_to_v2_user
Create Date: 2026-01-31 05:00:00

Changes:
1. v2_lottery_prize: Fix PUZZLE_C2 reward_amount from 0 to 1
2. user_game_wallet: Migrate PUZZLE_C balance to PUZZLE_C1 (convert legacy data)
3. user_game_wallet_ledger: Keep PUZZLE_C entries as historical (no change)

Note: PUZZLE_C is deprecated but kept in DB enum for backward compatibility.
New code should only use PUZZLE_C1, PUZZLE_C2, PUZZLE_J, PUZZLE_M.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = "20260131_0500_puzzle_c_deprecation_cleanup"
down_revision = "20260131_0400_fix_remaining_fk_to_v2_user"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. Fix v2_lottery_prize: PUZZLE_C2 reward_amount should be 1 (not 0)
    print("[1/3] Fixing v2_lottery_prize PUZZLE_C2 reward_amount...")
    conn.execute(text("""
        UPDATE v2_lottery_prize 
        SET reward_amount = 1 
        WHERE reward_type = 'PUZZLE_C2' AND reward_amount = 0
    """))
    
    # 2. Migrate PUZZLE_C wallet entries to PUZZLE_C1
    # For each user with PUZZLE_C balance, transfer to PUZZLE_C1
    print("[2/3] Migrating PUZZLE_C wallet balances to PUZZLE_C1...")
    
    # Get all PUZZLE_C wallet entries
    puzzle_c_entries = conn.execute(text("""
        SELECT user_id, balance FROM user_game_wallet 
        WHERE token_type = 'PUZZLE_C' AND balance > 0
    """)).fetchall()
    
    for entry in puzzle_c_entries:
        user_id = entry[0]
        balance = entry[1]
        
        # Check if PUZZLE_C1 already exists for this user
        existing_c1 = conn.execute(text("""
            SELECT id, balance FROM user_game_wallet 
            WHERE user_id = :user_id AND token_type = 'PUZZLE_C1'
        """), {"user_id": user_id}).fetchone()
        
        if existing_c1:
            # Add PUZZLE_C balance to existing PUZZLE_C1
            new_balance = existing_c1[1] + balance
            conn.execute(text("""
                UPDATE user_game_wallet 
                SET balance = :balance, updated_at = NOW()
                WHERE id = :id
            """), {"balance": new_balance, "id": existing_c1[0]})
        else:
            # Create new PUZZLE_C1 entry with PUZZLE_C balance
            conn.execute(text("""
                INSERT INTO user_game_wallet (user_id, token_type, balance, updated_at)
                VALUES (:user_id, 'PUZZLE_C1', :balance, NOW())
            """), {"user_id": user_id, "balance": balance})
        
        # Zero out the PUZZLE_C balance (keep record for audit)
        conn.execute(text("""
            UPDATE user_game_wallet 
            SET balance = 0, updated_at = NOW()
            WHERE user_id = :user_id AND token_type = 'PUZZLE_C'
        """), {"user_id": user_id})
        
        print(f"   Migrated user_id={user_id}: PUZZLE_C({balance}) -> PUZZLE_C1")
    
    # 3. Log migration summary
    print("[3/3] Creating migration audit log...")
    
    # Insert ledger entry for migration (if any data was migrated)
    if puzzle_c_entries:
        for entry in puzzle_c_entries:
            user_id = entry[0]
            balance = entry[1]
            conn.execute(text("""
                INSERT INTO user_game_wallet_ledger 
                (user_id, token_type, delta, balance_after, reason, label, created_at)
                VALUES (:user_id, 'PUZZLE_C1', :delta, :balance, 'MIGRATION', 'PUZZLE_C_DEPRECATION', NOW())
            """), {"user_id": user_id, "delta": balance, "balance": balance})
    
    print("✅ PUZZLE_C deprecation migration completed successfully!")


def downgrade() -> None:
    # Note: This is a data migration, downgrade is not fully reversible
    # We only revert the v2_lottery_prize fix
    conn = op.get_bind()
    
    print("[DOWNGRADE] Reverting v2_lottery_prize PUZZLE_C2 reward_amount to 0...")
    conn.execute(text("""
        UPDATE v2_lottery_prize 
        SET reward_amount = 0 
        WHERE reward_type = 'PUZZLE_C2' AND reward_amount = 1
    """))
    
    print("⚠️ Note: PUZZLE_C wallet data migration is NOT reverted (data preserved)")
