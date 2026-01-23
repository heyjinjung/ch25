# Critical Fix Plan: XP Exploit & CC Deposit Regressions
**Date:** 2026-01-24
**Status:** IMPLEMENTING

## Goal
Address user-reported issues:
1. **XP Exploit**: Infinite level up due to CC deposit input errors.
2. **CC Deposit Regressions**: Logic failures in idempotent processing and delta tracking.

## 1. XP Exploit Mitigation
### Problem
Incorrect CC deposit inputs (e.g., massive amounts or repeated calls) trigger excessive XP grants via `SeasonPassService` and `LevelXPService` hooks within `AdminCCDepositService`.

### Fix Strategy
- **Validation**: Enforce strict caps on single-transaction deposit amounts and daily XP grants from deposit sources.
- **Idempotency**: Ensure `upsert_many` strictly calculates deltas and does NOT re-grant XP for existing amounts.
- **Safeguards**: Add "circuit breaker" or explicit cap in `LevelXPService.add_xp` to prevent sudden massive level jumps.

### Changes
#### `app/v2/services/admin_cc_deposit_service.py`
- [MODIFY] `upsert_many`: Refine delta calculation logic. Ensure XP is only granted on *positive delta*.
- [NEW] Add sanity check: If deposit > `MAX_SAFE_DEPOSIT` (e.g. 50M), block or require manual override.

#### `app/services/level_xp_service.py`
- [MODIFY] `add_xp`: Add check for reasonable max XP per single transaction.

## 2. CC Deposit Logic Regressions
### Problem
`V2VaultService` method signatures or logic flow mismatch causing `AttributeError` and logic failures in tests.

### Fix Strategy
- **Correct Mocks**: Update test mocks to reflect `V2VaultService` actual methods.
- **Fix Interface**: Ensure `V2VaultService.handle_deposit_increase_signal` exists and has correct signature.

### Changes
#### `app/v2/services/vault_service.py`
- [VERIFY] `handle_deposit_increase_signal` implementation.

#### `tests/v2_tests/phase2_core/test_cc_deposit_logic.py`
- [MODIFY] Update mocks to use `V2VaultService` properly.

## Verification Plan
1. **Unit Test**: Run `test_cc_deposit_logic.py` until PASS.
2. **Exploit Test**: Create new test case `test_cc_deposit_xp_exploit` attempting to grant massive XP via repeated/large deposits. Verify it caps or fails safely.
