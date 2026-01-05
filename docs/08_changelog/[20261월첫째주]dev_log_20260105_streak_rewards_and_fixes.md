# [2026-01-05] Streak Rewards UX & User Onboarding Flow Fixes

## 1. 개요 (Overview)
- **목적**: 신규 유저 온보딩 경험 개선 및 보상 지급 로직의 중복 버그(티켓 2장 지급) 해결.
- **주요 작업**:
    - `SeasonPassService` 중복 지급 로직 제거 (Backend).
    - `AttendanceStreakModal` UX/UI 개선 (Frontend).
    - 서버 배포 환경(`DEPLOYMENT_ENV`) 최적화 및 검증 스크립트 작성.

## 2. 변경 사항 (Changes)

### 🛠 Backend (Python/FastAPI)
1. **Fix: Ticket Duplication (Double Grant)**
    - **Issue**: 신규 유저 생성 시 `Level 1` 보상(룰렛 티켓 1장)이 2번 지급되는 현상 발생.
    - **Root Cause**:
        1. `SeasonPassService._auto_claim_initial_level()`가 Progress 생성 시 보상 지급.
        2. 이후 `get_status` 호출 시 `_recover_missing_auto_claims()`가 동일한 보상을 누락된 것으로 판단하여 재지급.
    - **Resolution**: `_auto_claim_initial_level()` 로직을 **비활성화(Disabled)**. `add_bonus_xp` 및 `recover` 로직을 통해서만 단일 경로로 지급되도록 통일.
    - **File**: `app/services/season_pass_service.py`

2. **Refactor: Hardcoded Level Rewards Disabled**
    - **Issue**: `LevelXPService`에도 하드코딩된 레벨 보상(룰렛 티켓 3장 등)이 존재하여, `SeasonPassService`와 충돌 가능성이 있었음.
    - **Resolution**: `level_xp_service.py`의 `LEVELS` 배열 내 `auto_grant: False`로 설정하여 비활성화. DB 기반 `SeasonPassService`를 유일한 보상 소스(SoT)로 확정.
    - **File**: `app/services/level_xp_service.py`

3. **Ops: Admin User Purge Enabled**
    - **Settings**: `.env` 및 `docker-compose.yml`에 `ALLOW_ADMIN_USER_PURGE=true` 추가.
    - **Purpose**: QA 단계에서 테스트 유저 데이터(Wallet, Logs, Mission Progress)를 완전 삭제하여 재가입 테스트 용이성 확보.

### 📺 Frontend (React/TypeScript)
1. **UX Improvement: Attendance Streak Modal**
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

## 4. 향후 계획 (Next Steps)
- **AI2 (Frontend/QA)**:
    - 데일리 선물 팝업 UI 상태 점검.
    - 문서 및 인덱스(`docs/06_ops` 등) 최신화.
    - Changelog 병합 및 최종 리포트 작성.
