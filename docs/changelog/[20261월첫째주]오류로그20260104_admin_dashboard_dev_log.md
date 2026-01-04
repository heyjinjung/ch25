# Admin Operations Dashboard Development Log (2026-01-04)

This document tracks the files created and modified during the implementation of the "Operations Dashboard" (Daily Overview & Events Status).
Use this reference to identify potential conflicts or files to check if errors occur.

## 1. Backend

### New Files
*   **`app/services/admin_dashboard_service.py`**
    *   **Purpose**: Core logic for daily retention risk, settlement stats, and event metrics (Welcome, Streak, Golden Hour).
    *   **Key Functions**: `get_daily_overview()`, `get_event_status()`, `nudge_risk_group()`.
    *   **Dependencies**: `User`, `UserMissionProgress`, `VaultEarnEvent`, `DiceLog`.

### Modified Files
*   **`app/schemas/admin_dashboard.py`**
    *   **Changes**: Added `DailyOverviewResponse`, `EventsStatusResponse`, `EventMetric` schemas.
    *   **Note**: Originally overwrote existing `DashboardMetricsResponse`. User restored base classes. Ensure both exist.
*   **`app/api/admin/routes/admin_dashboard.py`**
    *   **Changes**: Added `/daily-overview`, `/events-status`, `/notifications/nudge` endpoints.
    *   **Incident**: Previously overwrote standard dashboard logic. Restored to contain *both* legacy metrics and new ops endpoints.

## 2. Frontend

### New Files
*   **`src/admin/pages/AdminOpsDashboard.tsx`**
    *   **Purpose**: Main container page for the Operations Dashboard. Uses Tabs for "Daily Overview" and "Events Status".
*   **`src/admin/components/dashboard/RiskMonitorCard.tsx`**
    *   **Purpose**: UI for Retention Risk count and "Nudge" button.
*   **`src/admin/components/dashboard/SettlementCard.tsx`**
    *   **Purpose**: UI for Vault Payout Ratio and Mission Completion stats.
*   **`src/admin/components/dashboard/EventsStatusBoard.tsx`**
    *   **Purpose**: UI for Welcome Mission stats, Streak counts, and Golden Hour status.

### Modified Files
*   **`src/admin/api/adminDashboardApi.ts`**
    *   **Changes**: Added `getDailyOverview`, `getEventsStatus`, `nudgeRiskGroup` and their types.
    *   **Note**: Restored `fetchDashboardMetrics`, `fetchStreakMetrics` which were briefly removed.
*   **`src/router/AdminRoutes.tsx`**
    *   **Changes**: Added route `/admin/ops` pointing to `AdminOpsDashboard`.

## 3. Recovery & Integrity Check
*   Ensure `app/api/admin/routes/admin_dashboard.py` has **both** `MetricValue`/`get_dashboard_metrics` AND new `get_daily_overview`.
*   Ensure `src/admin/api/adminDashboardApi.ts` has compatible types for both systems.
