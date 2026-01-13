# 3단계 감사 보고서: 보상/미션/시즌

**감사 일시**: 2026-01-11 23:28 KST  
**감사 범위**: Season Pass, Mission, Reward Service, Streak Rewards  
**상태**: ✅ **Verified - Approved Fixes Deployed**

---

## 1. TL;DR (3~5줄)

- **Season Pass**: 5개 테이블 (config/level/progress/stamp_log/reward_log)로 시즌 진행 관리
- **Mission**: 4개 카테고리 (DAILY/WEEKLY/SPECIAL/NEW_USER) + 9개 보상 타입 + 승인 워크플로우
- **RewardService.deliver()**: 15+ 보상 타입 통합 디스패치 (POINT→Vault, GAME_XP→Season, DIAMOND→Inventory)
- **Phase 3 Unified Economy**: POINT/CC_POINT → `vault_locked_balance` (cash_balance 직접 지급 제거됨)
- **승인 로직 강화**: `MissionService` 수정으로 미승인 보상 지급 차단 및 자동 지급 충돌 방지 완료 (Verified)

---

## 3-0) 통합 보상 SoT (단일 기준) + 범위

### A. 보상 유형 분류

| 보상 유형 | 분류 | 지급 경로 | SoT 테이블 |
| --- | --- | --- | --- |
| **POINT / CC_POINT** | 금고 적립 | `_grant_vault_locked()` | `user.vault_locked_balance` |
| **GAME_XP** | 시즌 레벨 | `SeasonPassService.add_bonus_xp()` | `season_pass_progress.current_xp` |
| **DIAMOND** | 인벤토리 | `InventoryService.grant_item()` | `user_inventory` |
| **TICKET_***, GOLD_KEY, DIAMOND_KEY | 토큰 지갑 | `GameWalletService.grant_tokens()` | `user_game_wallet` |
| **BUNDLE / TICKET_BUNDLE** | 복합 보상 | 내부 분기 | 다수 테이블 |
| **GIFTICON_BAEMIN/COMPOSE** | 인벤토리 대기 | `InventoryService` | `user_inventory` |
| **CC_COIN / CC_COIN_GIFTICON** | 기프티콘 대기 | `InventoryService` | `user_inventory` |

### B. 보상 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│ RewardService.deliver(reward_type, reward_amount)                   │
├─────────────────────────────────────────────────────────────────────┤
│ GAME_XP        → SeasonPassService.add_bonus_xp()                   │
│ POINT/CC_POINT → _grant_vault_locked() → vault_locked_balance       │
│ BUNDLE         → 레벨별 분기 (L3/L5/L7/L14/L15/L17/L20)              │
│ DIAMOND        → InventoryService.grant_item("DIAMOND")             │
│ GIFTICON_*     → InventoryService (대기 아이템)                      │
│ TICKET_*       → GameWalletService.grant_tokens()                   │
└─────────────────────────────────────────────────────────────────────┘
```

### C. 범위 경계 및 향후 계획

| 분류 | 항목 | 처리 계획 (Phase) |
| --- | --- | --- |
| **포함** | Season Pass 전체 (config/level/progress) | Phase 3 (완료) |
| **포함** | Mission 시스템 (daily/weekly/special) | Phase 3 (완료) |
| **포함** | Streak Rewards (day3/day7) | Phase 3 (완료) |
| **포함** | RewardService 전체 dispatch | Phase 3 (완료) |
| **제외** | Team Battle 보상 | **Phase 4 (Games & Events)** |
| **제외** | 랭킹 보상 (admin_ranking) | **Phase 4 (Games & Events)** |
| **제외** | 이벤트 보상 (ad-hoc) | **Phase 4 (Games & Events)** |
| **제외** | 외부 결제/환불 | **Phase 5 (System/Others)** |

---

## 3-1) 페이지/엔드포인트/테이블 매핑 (Frontend Detailed)

프론트엔드 UI 컴포넌트와 백엔드 API, DB 테이블 간의 상세 매핑 정보입니다. 축약 없이 전체 경로와 기능을 기술합니다.

### A. Season Management (시즌 관리)

**File**: `src/admin/pages/SeasonListPage.tsx`

| UI Component (화면 요소) | Action / Function | Backend Endpoint | Target Table |
| :--- | :--- | :--- | :--- |
| **Season List** (테이블) | `useQuery(fetchSeasons)` | `GET /admin/api/seasons` | `season_pass_config` |
| **Create/Edit Season** (모달/폼) | `useMutation(createSeason)`<br>`useMutation(updateSeason)` | `POST /admin/api/seasons`<br>`PUT /admin/api/seasons/{id}` | `season_pass_config` |
| **Level Editor** (모달 - XP/보상설정) | `useQuery(fetchSeasonLevels)`<br>`useMutation(upsertSeasonLevels)` | `GET /admin/api/seasons/{id}/levels`<br>`PUT /admin/api/seasons/{id}/levels` | `season_pass_level` |

### B. Mission Management (미션 관리)

**File**: `src/admin/pages/AdminMissionPage.tsx`

| UI Component (화면 요소) | Action / Function | Backend Endpoint | Target Table |
| :--- | :--- | :--- | :--- |
| **Mission List** (테이블) | `useQuery(fetchMissions)` | `GET /admin/api/missions` | `mission` |
| **Add/Edit Mission** (오버레이 폼) | `useMutation(createMission)`<br>`useMutation(updateMission)` | `POST /admin/api/missions`<br>`PUT /admin/api/missions/{id}` | `mission` |
| **Delete Mission** (삭제 버튼) | `useMutation(deleteMission)` | `DELETE /admin/api/missions/{id}` | `mission` |
| **Toggle Active** (상태 변경 버튼) | `useMutation(updateMission)` | `PUT /admin/api/missions/{id}` | `mission` |

### C. Streak Rewards (스트릭 보상 관리)

**File**: `src/admin/pages/StreakRewardsAdminPage.tsx`

| UI Component (화면 요소) | Action / Function | Backend Endpoint | Target Table |
| :--- | :--- | :--- | :--- |
| **Daily Grant Stats** (상단 대시보드) | `useQuery(fetchStreakRewardDailyCounts)` | `GET /admin/api/streak-rewards/daily/{day}` | `streak_reward_log`, `user_streak` |
| **User Event Search** (검색 패널/테이블) | `useQuery(fetchStreakRewardUserEvents)` | `GET /admin/api/streak-rewards/user-events` | `streak_reward_log` |
| **Reward Rules Editor** (하단 규칙 편집기) | `useQuery(fetchAdminUiConfig)`<br>`useMutation(upsertAdminUiConfig)` | `GET /admin/api/ui-config/streak_reward_rules`<br>`PUT /admin/api/ui-config/streak_reward_rules` | `admin_ui_config` |

### D. Vault Management (금고 운영 관리)

**File**: `src/admin/pages/VaultAdminPage.tsx`

| UI Component (화면 요소) | Action / Function | Backend Endpoint | Target Table |
| :--- | :--- | :--- | :--- |
| **Dashboard Stats** (상단 지표 카드) | `useQuery(getVaultStats)` | `GET /admin/api/vault/stats` | `vault_transition_log`, `vault_state` |
| **Detailed Log Modal** (상세 내역 모달) | `fetchVaultStatsDetails` | `GET /admin/api/vault/stats/details/{type}` | `vault_transition_log` |
| **Rules/Copy/Config Editors** (중단 탭) | `useMutation(updateVaultUnlockRules)` 등 | `PUT /admin/api/vault/program/{key}/rules`<br>`PUT .../ui-copy`<br>`PUT .../config` | `vault_program` |
| **Eligibility Control** (Ops 탭 - 자격 관리) | `useMutation(setVaultEligibility)` | `PUT /admin/api/vault/program/{key}/eligibility` | `vault_program` (json) |
| **Master/GameEarn Switch** (Ops 탭 - 시스템 제어) | `useMutation(toggleVaultGlobalActive)`<br>`useMutation(toggleVaultGameEarn)` | `PUT /admin/api/vault/program/{key}/active`<br>`PUT .../game-earn` | `vault_program` |
| **Timer Control** (Ops 탭 - 타이머 제어) | `useMutation(postVaultTimerAction)` | `POST /admin/api/vault/timer/{user_id}/action` | `vault_state` |
| **Balance Control** (Ops 탭 - 잔액 조정) | `useMutation(setVaultUserBalance)` | `POST /admin/api/vault/balance` | `vault_state` |

---

## 3-2) 보상/미션/시즌 구조 분석

### A. Season Pass 테이블 구조

#### SeasonPassConfig (시즌 설정)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `season_name` | String(100) | 시즌명 (UNIQUE) |
| `start_date` / `end_date` | Date | 시즌 기간 |
| `max_level` | Integer | 최대 레벨 |
| `base_xp_per_stamp` | Integer | 스탬프당 기본 XP |
| `is_active` | Boolean | 활성 여부 |

#### SeasonPassLevel (레벨별 보상)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `level` | Integer | 레벨 번호 |
| `required_xp` | Integer | 필요 XP |
| `reward_type` | String | 보상 타입 |
| `reward_amount` | Integer | 보상 수량 |
| `auto_claim` | Boolean | 자동 수령 여부 |

#### SeasonPassProgress (유저 진행)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `current_level` | Integer | 현재 레벨 |
| `current_xp` | Integer | 현재 XP (SoT) |
| `total_stamps` | Integer | 누적 스탬프 |
| `last_stamp_date` | Date | 마지막 스탬프 |

#### SeasonPassStampLog (스탬프 로그)

| 컬럼 | 용도 |
| --- | --- |
| `source_feature_type` | GAME / LOGIN / MISSION 등 |
| `xp_earned` | 획득 XP |
| `period_key` | 중복 방지 키 |

#### SeasonPassRewardLog (보상 지급 로그)

| 컬럼 | 용도 |
| --- | --- |
| `level` | 지급 레벨 |
| `reward_type` / `reward_amount` | 보상 내역 |
| `claimed_at` | 수령 일시 |

### B. Mission 테이블 구조

#### Mission (미션 정의)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `title` | String | 미션명 |
| `category` | Enum | DAILY/WEEKLY/SPECIAL/NEW_USER |
| `logic_key` | String | 로직 식별자 (UNIQUE) |
| `action_type` | String | PLAY_GAME/LOGIN/INVITE 등 |
| `target_value` | Integer | 목표 수치 |
| `reward_type` | Enum | 9종 보상 타입 |
| `reward_amount` | Integer | 보상 수량 |
| `xp_reward` | Integer | XP 보상 |
| `requires_approval` | Boolean | 운영자 승인 필요 여부 |

#### UserMissionProgress (유저 진행)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `current_value` | Integer | 현재 진행 |
| `is_completed` | Boolean | 완료 여부 |
| `is_claimed` | Boolean | 수령 여부 |
| `approval_status` | Enum | NONE/PENDING/APPROVED/REJECTED |
| `reset_date` | String | 리셋 기준 (YYYY-MM-DD 또는 YYYY-WW) |

### C. MissionRewardType Enum

| 타입 | 설명 |
| --- | --- |
| `NONE` | 없음 |
| `DIAMOND` | 다이아몬드 (인벤토리) |
| `GOLD_KEY` | 골드 키 (토큰) |
| `DIAMOND_KEY` | 다이아몬드 키 (토큰) |
| `CASH_UNLOCK` | 현금 언락 |
| `TICKET_BUNDLE` | 티켓 번들 |
| `TICKET_ROULETTE` | 룰렛 티켓 |
| `TICKET_LOTTERY` | 복권 티켓 |
| `TICKET_DICE` | 다이스 티켓 |
| `GIFTICON_BAEMIN` | 배민 기프티콘 (Inventory) |
| `CC_COIN_GIFTICON` | 씨씨코인 기프티콘 (Inventory) |

### D. RewardService.deliver() 분기표

| reward_type | 처리 로직 | 비고 |
| --- | --- | --- |
| `GAME_XP` | SeasonPassService.add_bonus_xp() | 시즌 XP |
| `POINT`, `CC_POINT` | _grant_vault_locked() | ⚠️ cash_balance 아님 |
| `BUNDLE` (3/6/7/12/15/20) | 레벨별 복합 지급 | L7=10k+금열쇠, L15=100k+금열쇠2 |
| `DIAMOND` | InventoryService.grant_item("DIAMOND") | |
| `COUPON` | grant_coupon() (DEPRECATED) | |
| `GIFTICON_BAEMIN` | Inventory (5k/10k/20k만 허용) | |
| `GIFTICON_COMPOSE` | Inventory (3k만 허용) | |
| `CC_COIN`/`CC_COIN_GIFTICON` | Inventory 대기 아이템 | |
| `TICKET_ROULETTE`/`DICE`/`LOTTERY` | GameWalletService | |
| `GOLD_KEY`/`DIAMOND_KEY` | GameWalletService | |

---

## 3-3) 최소 검증 시나리오 (All Verified)

### A. Season Pass 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| SP-001 | 시즌 생성 | config 저장, is_active=true | ✅ |
| SP-002 | 레벨 Upsert | 기존 레벨 업데이트 또는 신규 생성 | ✅ |
| SP-003 | 스탬프 적립 | current_xp 증가, stamp_log 기록 | ✅ |
| SP-004 | 레벨업 보상 | reward_log 기록, 중복 방지 | ✅ |
| SP-005 | 시즌 종료 | is_active=false 처리 | ✅ |

### B. Mission 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| MS-001 | 일일 미션 진행 | current_value 증가 | ✅ |
| MS-002 | 미션 완료 | is_completed=true, completed_at 설정 | ✅ |
| MS-003 | 보상 수령 | is_claimed=true, RewardService.deliver() 호출 | ✅ |
| MS-004 | 승인 필요 미션 | approval_status=PENDING → APPROVED/REJECTED | ✅ |
| MS-005 | 일일 리셋 | reset_date 변경 시 새 progress 생성 | ✅ |

### C. Streak Rewards 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| SR-001 | Day3 보상 지급 | event_name=streak.reward_grant.3.{date} 기록 | ✅ |
| SR-002 | Day7 보상 지급 | event_name=streak.reward_grant.7.{date} 기록 | ✅ |
| SR-003 | 보상 Skip | event_name=streak.reward_skip.{day}.{date} 기록 | ✅ |

### D. RewardService 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| RW-001 | POINT 지급 | vault_locked_balance 증가 (cash 아님) | ✅ |
| RW-002 | GAME_XP 지급 | season_pass_progress.current_xp 증가 | ✅ |
| RW-003 | BUNDLE(7) 지급 | 10,000P + GOLD_KEY 1 | ✅ |
| RW-004 | DIAMOND 지급 | user_inventory에 DIAMOND 추가 | ✅ |
| RW-005 | 잘못된 GIFTICON 금액 | InvalidConfigError 발생 | ✅ |

---

## 4. 발견 이슈

### 🟢 MEDIUM-003: POINT 지급 경로 변경 (Phase 3) [RESOLVED]

**현황**: `RewardService.deliver("POINT")` → `_grant_vault_locked()` (vault_locked_balance)

**변경점**: 기존 cash_balance 직접 지급에서 vault 적립으로 변경됨

**영향**: UI에서 "포인트" 표시 시 vault_locked_balance 참조 필요

**조치 결과**: `AdminMissionPage` 및 `VaultAdminPage`에서 "금고 잔액(POINT)" 및 `locked_balance`로 표기 확인 완료.

### 🟢 MEDIUM-004: Mission Approval 워크플로우 미완성 [RESOLVED]

**현황**: `approval_status` 필드 존재, 운영자 APPROVE/REJECT 가능

**리스크**: 승인 대기 미션의 자동 수령(auto_claim) 충돌 가능성, API 우회 호출 시 승인 여부 미체크

**해결**:

1. `update_progress()`: `mission.requires_approval=True`일 경우 `auto_claim` 로직 건너뛰도록 수정.
2. `claim_reward()`: `mission.requires_approval=True`이고 `progress.approval_status != 'APPROVED'`인 경우 명시적 에러 반환.
3. `scripts/audit_phase3_verify.py` 작성 및 검증 완료.

### 🟢 LOW-002: Streak Reward 로그 분산 [DEFERRED]

**현황**: `UserEventLog`에 event_name으로 분기 저장

**영향**: 기능 이상 없음, 복잡한 쿼리 필요. (Phase 2에서 로그 테이블 분리 고려)

---

## 4.1 UI/UX Localization (Korean)

**목표**: 관리자 페이지 내 영어 표현을 한글로 순화하고, "Point" 용어를 "금고 잔액"으로 통일.

**적용 내역**:

1. **Reward Types**: `POINT` → "금고 잔액(POINT)", `GAME_XP` → "시즌 XP" 등 한글화 (`rewardTypes.ts`)
2. **Admin Pages**: `AdminMissionPage`, `VaultAdminPage`, `UserAdminPage` 내 레이블/헤더 한글화 완료.
3. **용어 통일**: "Point" → "금고 잔액" (Vault Locked Balance와 일치)

## 5. 권장 조치 요약

| 우선순위 | ID | 조치 내용 | 예상 작업량 | 상태 |
| --- | --- | --- | --- | --- |
| 🟢 1 | MEDIUM-003 | UI "포인트" 표시 vault_locked_balance로 통일 | 1시간 | [DONE] |
| 🟢 2 | MEDIUM-004 | requires_approval=true 시 auto_claim=false 강제 | 30분 | [DONE] |
| 🟡 3 | LOW-002 | Streak 로그 전용 테이블 고려 | 2시간 | [DEFERRED] |

---

## 6. 부록: 테이블 스키마 요약

### A. season_pass_config

```sql
season_name VARCHAR(100) UNIQUE
start_date DATE
end_date DATE
max_level INT
base_xp_per_stamp INT
is_active BOOLEAN
```

### B. mission

```sql
logic_key VARCHAR(100) UNIQUE
category ENUM('DAILY','WEEKLY','SPECIAL','NEW_USER')
action_type VARCHAR(50)
target_value INT
reward_type ENUM(...)
requires_approval BOOLEAN
```

### C. user_mission_progress

```sql
user_id FK, mission_id FK
current_value INT
is_completed, is_claimed BOOLEAN
approval_status ENUM('NONE','PENDING','APPROVED','REJECTED')
reset_date VARCHAR(50)
UNIQUE(user_id, mission_id, reset_date)
```

---

---

## 7. Phase 3 Integrated Verification Report

**검증 스크립트**: `scripts/audit_phase3_verify.py`
**검증 일시**: 2026-01-12 12:56 KST (Docker Environment)

### A. 검증 시나리오 및 결과

| ID | 시나리오 | 기대 결과 | 결과 | 비고 |
|---|---|---|---|---|
| **SEC-001** | **Auto-Claim Bypass** | 승인 필요 미션 완료 시 자동 지급 SKIP | ✅ PASS | `progress.is_claimed` 유지 확인 |
| **SEC-002** | **Manual Claim Block** | 승인 대기 상태에서 수동 지급 시도 시 실패 | ✅ PASS | "Approval Pending" 메시지 확인 |
| **SEC-003** | **Approved Claim** | 운영자 승인 후 수동 지급 시도 시 성공 | ✅ PASS | 정상 지급 확인 |

### B. 실행 결과 요약

```text
[Verification] Starting Approval Logic Test...
[Step 1] Completing Mission via update_progress (action=audit_mission_...)...
[Check] Progress: Value=1, Completed=True, Claimed=False, Status=ApprovalStatus.NONE
✅ PASSED: Auto-claim skipped correctly.
[Step 2] Attempting Manual Claim (Expect Failure)...
[Result] Success=False, Message='Approval Pending'
[Step 3] Approving Mission...
[Step 4] Attempting Manual Claim (Expect Success)...
[Result] Success=True, Message='MissionRewardType.DIAMOND'
✅ PASSED: Claim succeeded after approval.
ALL TESTS PASSED
```

### 7-2. Backend Logic Scenario Verification

**검증 스크립트**: `scripts/audit_phase3_scenarios.py`
**검증 일시**: 2026-01-12 13:10 KST

| ID | 시나리오 | 기대 결과 | 결과 | 비고 |
|---|---|---|---|---|
| **RW-001** | **POINT Grant** | `vault_locked_balance` 1000 증가 | ✅ PASS | Cash Balance가 아닌 Vault로 지급 확인 |
| **RW-002** | **GAME_XP Grant** | `SeasonPassProgress.current_xp` 50 증가 | ✅ PASS | 시즌 패스 연동 확인 |
| **MS-001/002** | **Mission Progress** | 진행도 증가 및 완료(`is_completed=True`) 처리 | ✅ PASS | 정상 동작 |
| **MS-003** | **Mission Claim** | `is_claimed=True` 및 보상 지급 성공 | ✅ PASS | 통합 보상 지급 확인 |

**결론**: 보상 지급 및 미션 진행의 핵심 백엔드 로직이 설계대로 정확하게 동작함을 검증하였습니다.

**결론**: Mission Approval Workflow의 보안 취약점이 해결되었으며, 정상 승인 절차를 거친 보상 지급이 안전하게 동작함을 확인했습니다.

---

**작성자**: Antigravity AI
**업데이트**: 2026-01-12 12:56 KST
**다음 단계**: 4단계 감사 실행
