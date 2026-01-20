# V2 Test Execution Log - 2026-01-20

## 1. Overview
Validation of V2 Core Economy Logic against Source of Truth (SoT) documents.  
Focus Areas: **Level System (XP)** and **Vault System (Conditions & Policy)**.

- **Date:** 2026-01-20
- **Environment:** Local Test (Mock & DB Integration)
- **Executor:** Antigravity (Agent)

## 2. Test Execution Details

### A. Level System Calculation & Source Validation
- **Status:** ✅ PASSED
- **Test File:** `tests/v2_tests/core/test_level_system.py`
- **Scope:** 
  - `LevelXPService.add_xp`
  - `LevelXPService.grant_xp_for_deposit`
- **SoT Verification:**
  - **Source Restriction:** Confirmed XP is ONLY granted when `source="CC_DEPOSIT"`. Other sources (e.g., "GAME_WIN") are rejected (0 XP).
  - **Ratio:** Confirmed 20 XP per 100,000 KRW deposit (0 XP for 50,000 KRW).
  - **Source Validation:** Implemented case-insensitive checking (`cc_deposit`, `CC_DEPOSIT`).

### B. Vault Integration & Strict Policy
- **Status:** ✅ PASSED
- **Test File:** `tests/v2_tests/core/test_vault_sot_validation.py`
- **Scope:**
  - `VaultService.handle_deposit_increase_signal`
  - `VaultService.request_withdrawal`
  - `VaultService.get_user_vault_policy`
  - `VaultService.consume_locked_balance`
  - `VaultService.process_withdrawal`
- **SoT Verification:**
  1.  **Deposit Linkage:** 
      - Confirmed `handle_deposit_increase_signal` correctly updates `User.total_charge_amount`.
  2.  **Withdrawal Conditions (Strict):**
      - **Deposit Check:** Confirmed failure if NO deposit or NO net deposit today.
      - **Activity Check:** Confirmed failure if Play Count < 30 (Last 3 days).
      - **Spend Check:** Confirmed failure if Vault Spent Today < 10,000 KRW.
      - **Success Case:** Confirmed `request_withdrawal` succeeds only when ALL conditions are met.
  3.  **User Status & Limits:**
      - **Zero Deposit:** Confirmed `vault_max_limit` is capped at 30,000 KRW for users with 0 total charge.
      - **Active User:** Confirmed unlimited vault for active users.
  4.  **Consumption Logic:**
      - Confirmed `consume_locked_balance` correctly deducts `vault_locked_balance`.
      - Confirmed `process_withdrawal` (APPROVE) correctly deducts balance.

## 3. Summary of Changes
- Refactored `LevelXPService` to enforce strict Source Validation.
- Created comprehensive `test_vault_sot_validation.py` to cover all Vault SoT requirements.
- Cleaned up legacy/unused test files (`test_vault_core_functions.py`, `test_vault_integration.py` merged).

## 4. Next Steps
- Verify `UserStatus` transitions (Active <-> Inactive) based on real-time clock integration in Scheduler (if applicable).
- Proceed to Admin Panel UI verification for visualizing these backend statuses.
