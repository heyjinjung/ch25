# 2026-01-26_vault_withdrawal_condition_consistency_report

This document consolidates the verification and code update history for the consistency between the vault withdrawal conditions shown on the frontend and the actual backend logic.

---

## 🏁 Summary of Consistency Verification

| Item | Status | Details | Action Required |
|---|---|---|---|
| **Withdrawable Balance** | 🟢 Consistent | Confirmed use of `vault_locked_balance` as the single SoT | - |
| **Tiered Minimum Withdrawal** | 🟢 Consistent | [10k, 10k, 30k, 50k] tier policy synced between backend/frontend | - |
| **Game Play Condition** | 🔴 Inconsistent | FE: last 24h vs BE: last 3 days (range mismatch) | Update FE text or adjust BE logic |
| **Spend Condition** | 🔴 Inconsistent | FE: "cumulative spend" vs BE: "today's spend" (`vault_spent_today`) | Update FE text to "today's spend" |
| **Account/Deposit Verification** | 🔴 Inconsistent | FE: "account ownership verification" vs BE: "deposit today" | Unify label and logic |

---

## 🔍 Detailed Analysis

### 1. Game Play Condition
- **FE (`WithdrawalRulesChecklist.tsx`)**: Displayed as "Played X times in the last 24 hours".
- **BE (`V2VaultService.request_withdrawal`)**: Checks for at least one `GAME_PLAY` or `MISSION_REWARD` event in the last **3 days**.
- **Result**: Users may think they must play within 24h, but backend allows up to 3 days. FE is stricter than BE.

### 2. Spend Condition
- **FE (`WithdrawalRulesChecklist.tsx`)**: Displayed as "Cumulative spend".
- **BE (`V2VaultService.get_vault_info`)**: Uses `user.vault_spent_today` as `daily_vault_spent`.
- **Result**: "Cumulative" can be misunderstood as all-time. Should match BE's "today's spend" logic.

### 3. Account Ownership vs Deposit Today
- **FE (`WithdrawalRulesChecklist.tsx`)**: Displayed as "Account ownership verification completed".
- **BE (`V2VaultService.request_withdrawal`)**: Checks `has_cc_deposit_today` (any deposit today).
- **Result**: Logic requires a deposit today, but FE only asks for verification. Should clarify policy.

### 4. Dynamic Targets by Segment
- **BE (`V2VaultService.get_vault_info`)**:
  - Normal: 30 plays / 10,000 points
  - AT_RISK: 100 plays / 30,000 points
  - High deposit (3M+): 0 / 0 (immediate withdrawal)
- **Result**: Logic is calculated in BE and sent to FE, so consistent.

---

## 🧒 "Why is the text different from the actual rule?" (For non-experts)

1.  **Different time window**: 
    *   The UI says "Did you play today?" but the backend is more lenient: "Did you play in the last 3 days?". The UI is stricter than the actual rule.

2.  **'Cumulative' vs 'Today'**:
    *   The UI asks if you spent 10,000 points in total, but the backend only cares about today's spend. The text should clarify this.

3.  **Verification vs Deposit**:
    *   The UI says "verify your account", but the backend actually checks if you made a deposit today. This can confuse users who think verification is enough.

---

## 🛠️ Action Items (TODO)
- [ ] Update FE text: "last 24 hours" → "last 3 days" (or align BE logic)
- [ ] Change FE "cumulative spend" → "today's spend"
- [ ] Change "account verification" label to match BE's "deposit today" logic

---

## 🛠️ Code Update Summary

### 1. Frontend UI Text Refinement (`WithdrawalRulesChecklist.tsx`)
- **Game Play**: Changed "last 24 hours" → **"last 3 days"** to match backend.
- **Spend Condition**: Changed "cumulative spend" → **"today's spend"** to match `vault_spent_today`.
- **Verification Condition**: Changed "account verification" → **"deposit today"** to match backend logic.

### 2. Backend Logic Reinforcement (`vault_service.py`)
- **Stricter Play Count Check**: Now checks for segment-specific play targets (30/100/etc) instead of just 1 event in 3 days.
- **Spend Condition Check**: Ensures today's spend meets the target at withdrawal request time.
- **Code Robustness**: Improved user object scope and error handling.

---

## 🧒 "What changed?" (For non-experts)

1.  **UI is now honest**: 
    *   The UI now says "last 3 days" instead of "today", so users aren't misled.

2.  **Rules are now consistent**:
    *   The system now enforces the same rules as shown in the UI, so users know exactly what to expect.

3.  **Deposit is key**:
    *   The UI now clearly tells users that a deposit today is required, not just verification.

---

## ✅ Verification
- [x] FE `WithdrawalRulesChecklist.tsx` label updates confirmed
- [x] BE `V2VaultService.request_withdrawal` play/spend target checks confirmed
- [x] 09:00 KST reset logic confirmed

---
> [!NOTE]
> This update follows the "expression and implementation consistency" principle of `v2_strict_vault_policy_sot_ko.md`.

---

## ⚠️ Naming Convention Consistency & Real-World Risk

> **Important:**
> While the current SoT and all code use `snake_case` (e.g., `withdrawal_count`), it is **never guaranteed** that this will remain true forever.

- Backend serialization policy (snake_case vs camelCase) can change due to framework, team, or business requirements.
- External APIs, legacy migration, or partial refactoring may introduce mixed naming conventions.
- Large codebases and teams make it difficult to guarantee 100% synchronized changes when conventions change.

### Recommended Real-World Strategy

1. **Type/interface should ideally support both:**
    ```ts
    interface VaultStatusResponse {
      withdrawal_count?: number; // snake_case (current SoT)
      withdrawalCount?: number;  // camelCase (future-proof)
    }
    ```
2. **Code should safely fallback:**
    ```ts
    const count = vault.withdrawal_count ?? vault.withdrawalCount ?? 0;
    ```
3. **QA/Code Review:**
    - Always check that API response fields and code/types are in sync.
    - When changing serialization policy, plan for dual support and gradual migration.
4. **Automated tools:**
    - Use OpenAPI/Swagger codegen or similar tools to keep types in sync with backend.

### Why?
- Even if you "fix everything at once" during a naming policy change, there is always risk of missed spots, runtime bugs, or mixed data during migration.
- Dual field support and fallback logic are a small cost for much greater long-term safety and maintainability.

> **Bottom line:**
> Never assume naming conventions are permanent. Always design for possible change, especially in API boundaries.
