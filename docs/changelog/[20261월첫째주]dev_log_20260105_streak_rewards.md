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

## 3. UI/UX & Admin Dashboard Refactor
### Admin Dashboard Layout Optimization
*   **Goal**: Integrate "Game Participation" and "Ticket Usage" metrics into the "Daily Ops Summary" section for consistency.
*   **Backend (`app/services/admin_dashboard_service.py`)**:
    *   Added `today_ticket_usage` calculation to `get_daily_overview`.
    *   Added detail view handler support for `today_ticket_usage`.
*   **Frontend (`src/admin/pages/AdminDashboardPage.tsx`)**:
    *   Removed redundant top-level metric cards.
    *   Cleaned up unused state and API calls (removed `fetchDashboardMetrics`).
*   **Frontend (`src/admin/components/DailyOpsSummary.tsx`)**:
    *   Added "Ticket Usage" card and detail modal integration.

### UI Viewport Optimization (Telegram WebApp)
*   **Issue**: Modals (Golden Hour, Streak Reward) were cut off at the top in mobile viewports.
*   **Fix**:
    *   **Common**: Applied `fixed inset-0 p-4` layout with `items-center justify-center` to enforce safe areas.
    *   **Golden Hour Popup (`src/components/events/GoldenHourPopup.tsx`)**: Reduced vertical padding and icon size; unified border radius (`rounded-3xl`).
    *   **Streak Modal (`src/components/modal/AttendanceStreakModal.tsx`)**: Unified layout style, consistent border radius (`rounded-3xl` outer, `rounded-2xl` inner).

### API Route Fixes
*   **Issue 422 Error on `/admin/api/dice-config/event-params`**:
    *   **Cause**: Route definition order collision. Static route `event-params` was being captured by dynamic route `/{config_id}`.
    *   **Fix**: Moved static routes above dynamic path parameter routes in `app/api/admin/routes/admin_dice.py`.

## 4. Account Reset / Admin Purge (Hard Delete)

### Hard Purge API (Server-side)
*   **Goal**: Admin deletion leaves residues → provide a true “reset” that removes all user-linked data.
*   **API**: `POST /admin/api/users/{user_id}/purge` → **204 No Content**
*   **Backend Changes**:
    *   **File**: `app/services/admin_user_service.py`
        *   Implemented `purge_user(...)` to defensively delete dependent rows across related tables, then delete the user.
        *   Records admin audit log entry (e.g., `PURGE_USER`).
    *   **File**: `app/api/admin/routes/admin_users.py`
        *   Added/validated purge endpoint with admin auth.
*   **Security**: Admin-only via Bearer JWT (admin router dependency).
*   **Operational Note**: Gatekeeping by environment variables was removed to keep purge available (still requires admin auth).

### Admin UI: One-click PURGE
*   **Goal**: Avoid manual curl/CLI calls; allow ops to purge from admin screen.
*   **Frontend Changes**:
    *   **File**: `src/admin/api/adminUserApi.ts`
        *   Added `purgeUser(userId)` calling `/admin/api/users/{id}/purge`.
    *   **File**: `src/admin/pages/UserAdminPage.tsx`
        *   Added `PURGE` action button with confirm prompt.
        *   Uses react-query mutation; on success invalidates user list query and shows toast.

## 5. Telegram Unlink Workflow Bugfix
*   **Issue**: Unlink approval could fail due to `telegram_id` type mismatch (string vs number).
*   **Fix**: Normalize/compare IDs consistently in unlink approval logic; added regression coverage.

## 6. New User Day2 “2일차 출석 체크” Trigger Fix
*   **Issue**: Only calling `/api/new-user/status` did not advance LOGIN mission on KST day rollover; `last_login_at` not updated.
*   **Fix**:
    *   When KST date changes, `LOGIN` mission progresses and `last_login_at` updates even via status check.
    *   Set initial `last_login_at` on Telegram new user creation.
*   **Tests**: Added in-memory SQLite regression tests; updated related streak tests to match Phase 2 (manual claim) spec.

## 7. Current Incident / Next Debug Step
*   **Symptom**: 500 error observed (likely backend logic/DB issue). Needs server logs.
*   **Next**:
    1. Check backend container/app logs around the request time.
    2. Confirm DB constraints / FK deletes / missing tables/migrations on the deployed environment.
    3. Verify whether frontend is calling the correct backend base URL and that the backend image includes the purge route.
