# Incident Report: Infinite Mining Bug (Roulette)
**Date:** 2026-01-15
**Severity:** Critical
**Status:** Resolved (Recovery Complete, Fix in Progress)

## 1. Incident Summary
A critical configuration error in the Roulette game allowed users to enter an "Infinite Mining" loop. A user ("토쟁이", ID: 103) exploited this to play repeatedly without cost while accruing Vault points and inventory items.

## 2. Root Cause Analysis
*   **High Win Probability:** The Roulette segment weights were configured such that "Winning a Ticket" (Roulette, Dice) or "Winning a Gifticon" had a combined probability of **~77%**.
*   **Positive Feedback Loop:**
    *   Cost: 1 Ticket
    *   Return: > 0.77 Ticket (on average) + Vault Points (+200)
    *   Result: Users could sustain play indefinitely with minimal initial capital.
*   **Vault Accrual:** Every game play (regardless of win/loss) triggered a `VaultEarnEvent` (+200 KRW), allowing users to "mine" Vault balance mostly for free.

## 3. Exploit Timeline (User 103)
*   **08:05:41**: Acquired **1 DIAMOND** (Mission Reward).
*   **08:05:49**: Exchanged Diamond for **Roulette Coin**.
*   **08:10:47**: Started **Roulette Loop**.
*   **Mechanism**:
    1.  Spend 1 Ticket -> Spin Roulette.
    2.  Win Ticket (Refund) or Gifticon.
    3.  Accrue +200 Vault Points.
    4.  Repeat 65 times (35 Roulette, 30 Dice).

## 4. Impact Assessment (User 103)
*   **Total Plays**: 65
*   **Initial Capital**: 0 KRW (Free Play)
*   **Exploit Gains**:
    *   **Vault Balance**: 14,750 KRW
    *   **Inventory**: 15x BAEMIN_GIFTICON_5000, 1x CC_COIN, 1x GOLD_KEY
    *   **Actual Deposit**: 0 KRW

## 5. Recovery Actions Taken
### A. Diagnosis & Server Health
*   Verified Backend/Nginx status (200 OK).
*   Confirmed no 502 errors or system crashes (`docker stats`, logs).

### B. Forensic Log Extraction
*   **Script**: `scripts/dump_user_logs.py`
*   **Action**: Extracted full activity log (`user_log_103.txt`) from production server.
*   **Result**: Confirmed the exploit pattern and exact timelines.

### C. Asset Recovery (Completed)
*   **Script**: `scripts/cleanup_user_103.py`
*   **Target**: User ID 103
*   **Actions**:
    *   Reset `vault_locked_balance` to **0**.
    *   Reset `vault_balance` to **0**.
    *   Revoked all inventory items (Gifticons, Coins).
    *   Revoked all game wallet tickets.
*   **Outcome**: User completely reset to pre-exploit state.

## 6. Next Steps (Action Items)
1.  **[Immediate] Apply SQL Fix**: Update `roulette_segment` weights to reduce win probability (Target: ~10-20% win rate).
2.  **[Process] Review Config**: Audit `dice_config` and other games for similar imbalances.
3.  **[Code] Test Mode Safety**: Ensure `TEST_MODE` adjustments do not accidentally leak into production configurations.
