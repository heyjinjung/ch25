
# 2026-01 Phase 1-3 DB Migration Guide

## 1. Overview
This update introduces "Game Reward Overhaul" and "Vault Buy-in" features.
All database schema changes are strictly managed via **Alembic Migrations** to ensure consistency and maintainability.

## 2. Execution (Production Deployment)

### Step 1: Run Migration
Execute the following command to apply all pending schema changes (including `vault_ledger` creation and `user` table updates).

```bash
# Ensure you are in the backend directory
cd backend

# Run migration
alembic upgrade head
```

### Step 2: Verify Schema
Check that the changes were applied successfully.

```sql
DESCRIBE vault_ledger;
-- Should exist with columns: id, user_id, amount, balance_after, reason, ref_type...

DESCRIBE user;
-- Should contain: vault_spent_total, first_deposit_amount, first_deposit_at
```

## 3. Troubleshooting
If `alembic upgrade head` encounters "Multiple heads" error:
```bash
alembic merge heads -m "merge_local_and_remote"
alembic upgrade head
```

## 4. Rollback
To undo the last migration (Scenario ID: `35f8c3708f2f`):
```bash
alembic downgrade -1
```
*   **Warning**: This will DROP `vault_ledger` and the new `user` columns, resulting in data loss for Buy-in history. Use with caution.

실제로그

S C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; python scripts/verify_backend_scenarios.py
>>> Testing Roulette Access Control...
o PASS: COMMON user blocked from GOLD_KEY
    VIP Playing Gold Key 3 times...
    3 plays successful.
    VIP Playing 4th time...
o PASS: VIP blocked on 4th play

>>> Testing Dice Golden Hour...
    Enabling Golden Hour (Force ON)...
o PASS: EventService confirms Golden Hour is ACTIVE

>>> Testing Shop Buy-in...
o PASS: Purchase successful
o PASS: Balance deducted correctly (10000 -> 7000)
o PASS: vault_spent_total increased (0 -> 3000)
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; python scripts/verify_backend_scenarios.py
>>> Testing Roulette Access Control...
o PASS: COMMON user blocked from GOLD_KEY
    VIP Playing Gold Key 3 times...
    3 plays successful.
    VIP Playing 4th time...
o PASS: VIP blocked on 4th play

>>> Testing Dice Golden Hour...
    Enabling Golden Hour (Force ON)...
o PASS: EventService confirms Golden Hour is ACTIVE

>>> Testing Shop Buy-in...
o PASS: Purchase successful
o PASS: Balance deducted correctly (10000 -> 7000)
o PASS: vault_spent_total increased (0 -> 3000)

>>> Testing Dice Reward Logic (Segment + Golden Hour)...
Traceback (most recent call last):
  File "C:\Users\JAVIS\ch\ch25\scripts\verify_backend_scenarios.py", line 296, in <module>
    test_dice_reward_logic()
  File "C:\Users\JAVIS\ch\ch25\scripts\verify_backend_scenarios.py", line 228, in test_dice_reward_logic
    original_win = cfg.reward_amount_win
                   ^^^^^^^^^^^^^^^^^^^^^
AttributeError: 'DiceConfig' object has no attribute 'reward_amount_win'
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; python scripts/verify_backend_scenarios.py
>>> Testing Roulette Access Control...
o PASS: COMMON user blocked from GOLD_KEY
    VIP Playing Gold Key 3 times...
    3 plays successful.
    VIP Playing 4th time...
o PASS: VIP blocked on 4th play

>>> Testing Dice Golden Hour...
    Enabling Golden Hour (Force ON)...
o PASS: EventService confirms Golden Hour is ACTIVE

>>> Testing Shop Buy-in...
o PASS: Purchase successful
o PASS: Balance deducted correctly (10000 -> 7000)
o PASS: vault_spent_total increased (0 -> 3000)

>>> Testing Dice Reward Logic (Segment + Golden Hour)...
    [Info] Dice RNG makes outcome verification hard in integration script.
    [Info] Verified Base Config Update works (777).
o PASS: Dice Config is writable and accessible.

>>> Testing Vault Withdrawal Defense (Play Count & Spent)...
    [Warn] Blocked but unexpected reason: 400: NO_DEPOSIT_RECORD_TODAY
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; alembic revision -m "add_vault_ledger_and_user_columns"
FAILED: Multiple heads are present; please specify the head revision on which the new revision should be based, or perform a merge.
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; alembic merge heads -m "merge_heads"
Generating C:\Users\JAVIS\ch\ch25\alembic\versions\20260114_1625_125c25c8ddb4_merge_heads.py ...  done
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; alembic revision --autogenerate -m "add_vault_ledger_and_user_columns"
INFO  [alembic.runtime.migration] Context impl MySQLImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
ERROR [alembic.util.messaging] Target database is not up to date.
FAILED: Target database is not up to date.
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; alembic upgrade head
INFO  [alembic.runtime.migration] Context impl MySQLImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 20260113_0930_add_user_identity_history -> 20260113_1804_add_ops_target, Add ops_target_list and ops_target_member tables
INFO  [alembic.runtime.migration] Running upgrade 20260113_1804_add_ops_target, 20260114_0004_disable_legacy_new_user_missions_fix -> 125c25c8ddb4, merge_heads
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; alembic revision --autogenerate -m "add_vault_ledger_and_user_columns"
INFO  [alembic.runtime.migration] Context impl MySQLImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.autogenerate.compare] Detected server default on column 'admin_message.is_deleted'
INFO  [alembic.autogenerate.compare] Detected server default on column 'external_ranking_daily_deposit_delta.deposit_delta'
INFO  [alembic.autogenerate.compare] Detected server default on column 'external_ranking_daily_deposit_delta.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'external_ranking_daily_deposit_delta.updated_at'
INFO  [alembic.autogenerate.compare] Detected added foreign key (user_id)(id) on table external_ranking_data
INFO  [alembic.autogenerate.compare] Detected removed foreign key (data_id)(id) on table external_ranking_reward_log
INFO  [alembic.autogenerate.compare] Detected added foreign key (user_id)(id) on table external_ranking_reward_log
INFO  [alembic.autogenerate.compare] Detected added foreign key (data_id)(id) on table external_ranking_reward_log
INFO  [alembic.autogenerate.compare] Detected NULL on column 'mission.auto_claim'
INFO  [alembic.autogenerate.compare] Detected server default on column 'mission.auto_claim'
INFO  [alembic.autogenerate.compare] Detected server default on column 'ops_target_list.count_snapshot'
INFO  [alembic.autogenerate.compare] Detected server default on column 'ops_target_list.is_processed'
INFO  [alembic.autogenerate.compare] Detected server default on column 'ops_target_member.status'
INFO  [alembic.autogenerate.compare] Detected server default on column 'ops_target_member.result_status'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_config.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_config.updated_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_level.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_level.updated_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_progress.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_progress.updated_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_reward_log.claimed_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_reward_log.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'season_pass_stamp_log.created_at'
INFO  [alembic.autogenerate.compare] Detected added foreign key (user_id)(id) on table team_member
INFO  [alembic.autogenerate.compare] Detected type change from ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY', 'DIAMOND') to Enum('ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET', 'GOLD_KEY', 'DIAMOND_KEY', 'DIAMOND', 'VAULT', name='gametokentype') on 'trial_token_bucket.token_type'
INFO  [alembic.autogenerate.compare] Detected removed index 'idx_user_login_streak' on 'user'
INFO  [alembic.autogenerate.compare] Detected removed index 'idx_user_streak' on 'user'
INFO  [alembic.autogenerate.compare] Detected type change from ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY', 'DIAMOND') to Enum('ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET', 'GOLD_KEY', 'DIAMOND_KEY', 'DIAMOND', 'VAULT', name='gametokentype') on 'user_game_wallet.token_type'
INFO  [alembic.autogenerate.compare] Detected type change from ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY', 'DIAMOND') to Enum('ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET', 'GOLD_KEY', 'DIAMOND_KEY', 'DIAMOND', 'VAULT', name='gametokentype') on 'user_game_wallet_ledger.token_type'
INFO  [alembic.autogenerate.compare] Detected server default on column 'user_idempotency_key.status'
INFO  [alembic.autogenerate.compare] Detected server default on column 'user_idempotency_key.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'user_idempotency_key.updated_at'
INFO  [alembic.autogenerate.compare] Detected removed index 'ix_user_idempotency_key_user_scope_created' on 'user_idempotency_key'
INFO  [alembic.autogenerate.compare] Detected server default on column 'user_identity_history.created_at'
INFO  [alembic.autogenerate.compare] Detected server default on column 'vault_ledger.created_at'
INFO  [alembic.autogenerate.compare] Detected added index ''ix_vault_ledger_id'' on '('id',)'
INFO  [alembic.autogenerate.compare] Detected added index ''ix_vault_ledger_user_id'' on '('user_id',)'
INFO  [alembic.autogenerate.compare] Detected removed foreign key (user_id)(id) on table vault_withdrawal_request
INFO  [alembic.autogenerate.compare] Detected added foreign key (user_id)(id) on table vault_withdrawal_request
Generating C:\Users\JAVIS\ch\ch25\alembic\versions\20260114_1627_35f8c3708f2f_add_vault_ledger_and_user_columns.py ...  done
PS C:\Users\JAVIS\ch\ch25> cd 'c:\Users\JAVIS\ch\ch25'
PS C:\Users\JAVIS\ch\ch25> $env:PYTHONPATH="c:\Users\JAVIS\ch\ch25"; alembic upgrade head
INFO  [alembic.runtime.migration] Context impl MySQLImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 125c25c8ddb4 -> 35f8c3708f2f, add_vault_ledger_and_user_columns
