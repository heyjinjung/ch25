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

---

## 4. Additional Work (Same Session)

This section records additional changes completed in the same work session (beyond the Ops Dashboard scope).

### 4.1 Admin - Streak Rewards (운영툴)
*   **Modified**: `src/admin/pages/StreakRewardsAdminPage.tsx`
    *   UI 한글화(헤더/라벨/액션) 적용.
    *   규칙에 `pinned`(핀 고정) 필드 추가 및 **핀 우선 -> day 오름차순** 정렬 적용.
    *   저장/복원 payload에 `pinned` 포함(설정 저장소: `app_ui_config`의 `streak_reward_rules`).

### 4.2 User-Facing Guide Copy
*   **Modified**: `src/pages/GuidePage.tsx`
    *   "입금(충전) 강요"로 읽히는 카피 제거 및 표현 순화.
    *   연동/반영은 선택이며 체험 티켓으로도 시작 가능하도록 안내 강화.

### 4.3 Docs (SoT 정합성)
*   **Modified**: `docs/00_meta/weekly/[20261월첫째주]_핵심문서_인덱스.md`
    *   72시간 슬롯 운영 플랜 링크 포함 및 최신화 포인트 반영.
*   **Modified**: `docs/06_ops/events/20260104_streak_mission_event_plan_ko.md`
    *   스트릭/운영일 리셋 기준을 KST 00:00으로 통일.
*   **Modified**: `docs/06_ops/ops/[20261월첫째주] [2026001#]SERVER_ENV_ONBOARDING.md`
*   **Modified**: `docs/06_ops/deployment/DEPLOYMENT_root.md`
    *   `/api/health` 스모크, admin API 무토큰 401 정상, alembic current/heads 정합성 체크 등 운영 체크 강화.
*   **Modified**: `docs/06_ops/events/20260104_event_plan_evaluation_ko.md`
*   **Modified**: `docs/08_changelog/20260104_system_cleanup_and_feature_updates.md`

### 4.4 Runtime Stability (Docker/Nginx/Bot)
*   **Modified**: `docker-compose.yml`
    *   `telegram_bot` 재시작 정책을 토큰 미설정 환경에서 과도한 재시작을 피하도록 조정.
*   **Modified**: `nginx/nginx.conf`
    *   Docker DNS resolver 및 webhook 프록시 관련 런타임 안정성 개선.

### Known Environment Blockers (not code)
*   로컬에서 nginx SSL 인증서 파일(`nginx/ssl/fullchain.pem`, `nginx/ssl/privkey.pem`)이 없으면 nginx 기동이 실패할 수 있음.

---
Operating Mode (MANDATORY)
Always follow: PLAN → PATCH → VERIFY → SHIP
Never jump to code changes before PLAN is written and accepted.
PLAN output format (must follow)
A) Triage Summary (facts only, 3–6 lines)
B) Root Cause Hypotheses TOP3 (ranked)

Why plausible
How to confirm (1 minimal check each)
C) Fix Plan
Allowed Files (full paths, max 12)
Out of Scope (explicit)
Minimal patch strategy (no refactor)
Verify Checklist (backend + frontend + DB as applicable)
D) If missing info: ask ONCE with a short list of required artifacts.
PATCH rules
Change ONLY Allowed Files.
Do NOT overwrite whole files; read first then minimal diff patch.
If a new needed change is outside scope: STOP and propose a follow-up ticket.
VERIFY rules
Provide a step-by-step checklist that a human can execute.
Prefer existing scripts/tests (pytest target, debug scripts) when relevant.
SHIP rules
Summarize: changed files + behavior change + risk + rollback
If behavior changed, update docs/changelog and docs index references

## 5. New User Reward Verification & Fixes (2026-01-05)

### 5.1 Issue Summary
*   **Initial 10k Bonus**: New users were starting with 10k KRW (from old Telegram specific hardcoded logic). -> Fixed to start with 0.
*   **Mission Accrual Failure**: Mission rewards (e.g., 2,500 KRW) were marked as "Claimed" but balance remained 0 (Silent Failure).
*   **Day 2 Login Mission**: Users logging in on the second day weren't triggering the mission completion due to missing foreground re-auth.

### 5.2 Key Fixes
1.  **Backend Logic (`VaultService`)**:
    *   **Removed Eligibility Check**: Welcome missions should bypass strict Vault eligibility rules (Phase 1 legacy).
    *   **Fixed Global Lock Bug**: Updated `earn_event_id` from `MISSION:{id}` to `MISSION:{user_id}:{id}`. Previously, *any* user claiming a mission would lock *all* users from claiming it.
2.  **Mission Logic (`MissionService`)**:
    *   **Daily Gift Fix**: Updated fallback logic to respect Admin-configured `daily_login_gift` logic key.
3.  **Frontend Logic (`RequireAuth.tsx`)**:
    *   **Foreground Re-Auth**: Added `visibilitychange` listener. When the app returns from background (Resumed), it triggers a silent `telegramApi.auth()` call. This ensures the server captures the "Login" event for date-based missions (Day 2 check).
4.  **UI Improvement**:
    *   **Streak Modal**: Added "수령 완료 (Claimed)" state to the button instead of hiding it or showing an active button incorrectly.

### 5.3 🚀 Efficient Testing Methodology (Recommended)
Instead of full deployments or local setups, we used **Ephemeral Server-Side Scripting** to verify logic in real-time.

**Command Pattern:**
```bash
docker compose exec -T backend python3 -c '
import sys, os; sys.path.append(os.getcwd())
from sqlalchemy import create_engine; from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.user import User; from app.services.mission_service import MissionService

# 1. Setup DB Session & Temporary User
db = sessionmaker(bind=create_engine(get_settings().database_url))()
u = User(external_id="test_ephemeral", nickname="Tester", telegram_id="99999")
db.add(u); db.commit(); db.refresh(u)

try:
    # 2. Execute Logic Directly
    ms = MissionService(db)
    # ... call methods to test ...
    print("SUCCESS: Logic verified.")
except Exception as e:
    print(f"FAIL: {e}")
finally:
    # 3. Cleanup
    db.delete(u); db.commit()
'
```

**Benefits:**
*   **Speed**: No build/deploy cycle required. Logic changes are verified instantly after file edit.
*   **Accuracy**: Runs in the exact same environment (Docker container, DB connection) as production code.
*   **Safety**: Test users are created and deleted within the script transaction.
*   **Focus**: Isolates logic flaws (e.g., return 0, exceptions) that might be swallowed by API error handlers.
