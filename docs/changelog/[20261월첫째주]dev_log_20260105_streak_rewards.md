# Development Log (2026-01-05)

## 1. Feature Fixes & Improvements

### Streak Reward System Refactor (Manual Claim)
*   **Goal**: Ensure users actively acknowledge receiving rewards ("Make them press Receive!").
*   **Change**: Transitioned from Auto-Grant (Silent) to Manual Claim (Interactive).
*   **Backend Changes**:
    *   **File**: `app/services/mission_service.py`
        *   Disabled auto-grant logic in `_maybe_grant_streak_milestone_rewards`.
        *   Implemented `get_pending_streak_milestone` to detect highest unclaimed reward.
        *   Implemented `claim_streak_reward` to process the grant transaction.
    *   **File**: `app/api/routes/mission.py`
        *   Added `POST /api/mission/streak/claim` endpoint.
*   **Frontend Changes**:
    *   **File**: `src/stores/missionStore.ts`
        *   Added `claimStreakReward` action and updated `StreakInfo` type.
    *   **File**: `src/components/modal/AttendanceStreakModal.tsx`
        *   Added "Receive Reward" (보상 받기) button state.
        *   Button triggers API claim and closes modal on success.
    *   **File**: `src/components/layout/AppHeader.tsx`
        *   Added logic to auto-open modal if `streakInfo.claimable_day` is set.
        *   Ensured modal props (`onClaim`, `claimableDay`) are passed correctly.

### Daily Gift Mission Fix
*   **Issue**: "Daily Gift" mission was not completing (Toast not showing) for users with persistent sessions or Telegram auth.
*   **Cause**: 
    1.  Valid session tokens allowed bypassing the `/auth/token` login trigger.
    2.  Telegram Auth endpoint lacked the mission trigger call.
*   **Fix**:
    *   **Backend (`app/api/routes/mission.py`)**: Added "Lazy Daily Check" in `READ /api/mission/`. If a user with a stale `last_login_at` loads missions, the system now auto-updates their Login Mission progress.
    *   **Backend (`app/api/routes/telegram.py`)**: Updated Telegram Auth route to explicitly trigger `LOGIN` mission.

### Streak Modal Persistence Fix (Disappearing Modal)
*   **Issue**: Streak Reward Modal would disappear immediately after appearing on the Mission Page.
*   **Cause**: `fetchMissions` (called by Mission Page) was momentarily overwriting the global `streakInfo` store state with `null` or incomplete data during refresh, causing the modal to unmount.
*   **Fix**:
    *   **Frontend (`src/stores/missionStore.ts`)**: Implemented defensive logic to preserve existing `streakInfo` if the API response does not contain valid streak data.

## 2. Build Verification
*   **Status**: PASSED
*   **Frontend**: `npm run build` (TypeScript + Vite) -> **Success (0 Errors)**
*   **Backend**: Python Compile Check -> **Success (0 Errors)**
