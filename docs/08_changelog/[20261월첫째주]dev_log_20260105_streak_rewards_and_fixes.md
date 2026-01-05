# [2026-01-05] Streak Rewards UX & User Onboarding Flow Fixes

## 1. 개요 (Overview)
- **목적**: 신규 유저 온보딩 경험 개선 및 보상 지급 로직의 중복 버그(티켓 2장 지급) 해결.
- **주요 작업**:
    - `SeasonPassService` 중복 지급 로직 제거 (Backend).
    - `AttendanceStreakModal` UX/UI 개선 (Frontend).
    - 서버 배포 환경(`DEPLOYMENT_ENV`) 최적화 및 검증 스크립트 작성.

## 2. 변경 사항 (Changes)

### 🛠 Backend (Python/FastAPI)
1. **Dice Event Implementation**
    - **Logic**: `DiceService._is_event_active` implemented with:
        - **Stake Check**: `vault_locked_balance > 0` required to participate.
        - **Deposit Check**: `daily_base_deposit >= 300,000` (High Roller entry condition).
        - **Event Caps**: Daily plays cap (default 30) applied via config.
        - **Progress Tracking**: `VaultStatus.progress_json` used to track `plays_done`.
    - **API Update**: `get_status` now returns `event_plays_done` and `event_plays_max` for UI progress display.
    - **File**: `app/services/dice_service.py`, `app/schemas/dice.py`

2. **Fix: Ticket Duplication (Double Grant)**
    - **Issue**: 신규 유저 생성 시 `Level 1` 보상(룰렛 티켓 1장)이 2번 지급되는 현상 발생.
    - **Root Cause**:
        - `SeasonPassService._auto_claim_initial_level()`가 Progress 생성 시 보상 지급.
        - 이후 `get_status` 호출 시 `_recover_missing_auto_claims()`가 동일한 보상을 누락된 것으로 판단하여 재지급.
    - **Resolution**: `_auto_claim_initial_level()` 로직을 **비활성화(Disabled)**. `add_bonus_xp` 및 `recover` 로직을 통해서만 단일 경로로 지급되도록 통일.
    - **File**: `app/services/season_pass_service.py`

3. **Refactor: Hardcoded Level Rewards Disabled**
    - **Issue**: `LevelXPService`에도 하드코딩된 레벨 보상(룰렛 티켓 3장 등)이 존재하여, `SeasonPassService`와 충돌 가능성이 있었음.
    - **Resolution**: `level_xp_service.py`의 `LEVELS` 배열 내 `auto_grant: False`로 설정하여 비활성화. DB 기반 `SeasonPassService`를 유일한 보상 소스(SoT)로 확정.
    - **File**: `app/services/level_xp_service.py`

4. **Ops: Admin User Purge Enabled**
    - **Settings**: `.env` 및 `docker-compose.yml`에 `ALLOW_ADMIN_USER_PURGE=true` 추가.
    - **Purpose**: QA 단계에서 테스트 유저 데이터(Wallet, Logs, Mission Progress)를 완전 삭제하여 재가입 테스트 용이성 확보.

5. **Fix: Streak Claim Button Not Appearing (claimable_day dropped)**
    - **Issue**: `/api/mission/` 응답에 `claimable_day`가 포함되어도 Pydantic 응답 모델에서 필드가 누락되어 프론트가 수령 가능 상태를 못 받음.
    - **Resolution**: `StreakInfoSchema`에 `claimable_day` 필드 추가.
    - **File**: `app/schemas/mission.py`

6. **Fix: Trial Roulette Diamonds Not Added to Inventory**
    - **Issue**: `ENABLE_TRIAL_PAYOUT_TO_VAULT=true` 환경에서 TRIAL 토큰으로 룰렛 플레이 시, 다이아(DIAMOND) 보상이 Vault 라우팅 조건에 걸려 인벤토리 지급이 스킵될 수 있음.
    - **Resolution**: TRIAL payout-to-vault 경로는 비-인벤토리 보상만 라우팅하도록 가드하고, DIAMOND는 항상 인벤토리 지급을 유지.
    - **File**: `app/services/roulette_service.py`

7. **Dev Tooling: Verify Streak Claim End-to-End for Existing User**
    - **Purpose**: 실제 테스터 `user_id`로 `claimable_day` 계산 및 `/streak/claim` 클레임 흐름을 end-to-end로 빠르게 검증.
    - **Change**: `scripts/debug_streak_reward_claim.py`에 기존 유저 모드 추가.
        - `--user-id <ID>`: 기존 유저 대상으로 실행(유저 생성/삭제 없음)
        - `--set-rule`: 필요 시에만 임시 룰 오버라이드(기본은 미변경)
    - **Safety**: 기존 유저 모드에서는 기본적으로 streak 시뮬레이션/정책 변경을 수행하지 않도록 방어.
    - **File**: `scripts/debug_streak_reward_claim.py`

### 📺 Frontend (React/TypeScript)
1. **Dice Event UI**
    - **Banner**: `DiceEventBanner` shows "PEAK TIME EVENT" with progress (e.g., "5 / 30").
    - **Integration**: `DicePage` passes status data to banner and integrates `TicketZeroPanel` and `VaultAccrualModal`.
    - **Fix**: Resolved "Failed to fetch dynamically imported module" via full rebuild.
    - **File**: `src/pages/DicePage.tsx`, `src/components/game/DiceEventBanner.tsx`

2. **UX Improvement: Attendance Streak Modal**
    - **Issue**: 0일차(신규) 유저에게 "수령 완료" 버튼이 노출되어 보상을 이미 받은 것으로 오해 유발. "다음 보상" 라벨이 고정값(1일차)으로 노출됨.
    - **Resolution**:
        - **0일차 상태**: "⏳ 게임 플레이 대기" 및 "게임 시작 후 보상 시작!" 문구 표시.
        - **버튼 상태**: 보상 미달성 시 "수령 완료" 대신 "다음 보상 대기"로 변경 (Disabled).
        - **Next Reward**: `{currentStreak + 1}일차`로 동적 표시.
    - **File**: `src/components/modal/AttendanceStreakModal.tsx`

## 3. 검증 결과 (Verification)

### ✅ Post-Deployment Verification (`scripts/verify_post_deploy.py`)
| 항목 | 결과 | 비고 |
| :--- | :--- | :--- |
| **Ticket Grant** | **PASS** (1 Ticket) | 신규 유저 생성 시 룰렛 티켓 정확히 1장 지급 확인. |
| **User Purge** | **PASS** | 어드민 유저 삭제 API 정상 동작. |
| **Golden Hour Logic** | **PASS** | 시간대 비교 로직(KST) 정상 동작 확인. |
| **Mission List** | **PASS** | 신규 유저 미션 4종 정상 노출. |
| **Dice Event Backend**| **PASS** | Logic verified (Stake check, Progress tracking). |

### ✅ Targeted Pytest Regression
- **Streak Spec**: `tests/test_streak_event_spec_midnight.py` → **6 passed**
- **Trial Payout**: `tests/test_trial_payout_to_vault.py` → **4 passed**

### ✅ Ops Note (Trial Payout-to-Vault)
- `ENABLE_TRIAL_PAYOUT_TO_VAULT`는 운영에서 기본 **OFF 권장**(레거시/옵션 경로).
- ON 환경에서도 **인벤토리 SoT 보상(DIAMOND)** 은 Vault 라우팅으로 인해 누락되지 않도록 가드.

## 4. 향후 계획 (Next Steps)
- **Monitoring**: Verify live metrics for Dice Event participation.
- **Admin**: Ensure config values can be tuned via Admin UI.
- **QA**: 실 테스터 `user_id`로 `scripts/debug_streak_reward_claim.py --user-id <ID> --day 3|7` 실행하여 `claimable_day` 및 클레임 반영 확인.
