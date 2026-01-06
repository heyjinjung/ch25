# 통합 경제 리팩토링 체크리스트 (Unified Economy Refactoring Checklist)

## 0. 개요
* **목표**: `POINT`/`GAME_XP` 분리, 금고(`Vault`) 단일 SoT로 현금성 보상 통합, `cash_balance` 제거, 기프티콘/보상 라벨 정비.
* **기준서**: `docs/06_ops/202601/[20261월첫째주] [2026001#] unified_economy_and_progression_ko.md`
* **상태**: **진행 중(In Progress)**

---

## 1. 백엔드 서비스 (13 Items)
- [x] **1-1. `RewardService.deliver` 리팩토링**
    - [x] `POINT`/`CC_POINT` 분기에서 `_grant_vault_locked` 호출로 변경(사유 무관 금고 적립).
    - [x] `GAME_XP` 보상 타입 신설 및 `SeasonPassService` 연동 추가.
    - [x] `xp_from_game_reward` 플래그 제거/무시.
    - [x] `cash_balance` 직접 증감 로직(`grant_point`) 제거.
    - [x] `BUNDLE` 등 하드코딩 포인트 지급 경로(`grant_point`) → `_grant_vault_locked`.
    > **[Memo]** `RewardService.deliver` V3 적용. `grant_point` 대신 `_grant_vault_locked`. `GAME_XP` 타입 처리 추가.

- [x] **1-2. `VaultService` 수정**
    - [x] 만료/락 타이머 제거(즉시 적립).
    - [x] `UserCashLedger` reason/meta 보강(`VAULT_ACCRUAL`, `asset_type: VAULT`).
    > **[Memo]** `_ensure_locked_expiry`, `_expire_locked_if_due` 비활성(False). 금고 적립 로그 추가.

- [x] **1-3. 게임 서비스 (`Roulette`, `Dice`, `Lottery`)**
    - [x] `RouletteService` 기본 적립+`POINT` 당첨 이중 적립 방지.
    - [x] KEY 룰렛 `POINT` 강제변환 → 금고 적립 경로 확인.
    - [x] `DiceService` 승/패 적립 경로 통합(기본+보상).
    > **[Memo]** 각 `play`에서 `record_game_play_earn_event`로 금고 자동 적립. `RewardService.deliver`는 `POINT` 외 처리.

- [x] **1-4. 기타 서비스**
    - [x] `MissionService`: CLAIM 시 보상 분기(POINT→금고, XP→GAME_XP).
    - [x] `AttendanceService`: 스트릭/출석 보상 지급 경로 교정.
    > **[Memo]** `MissionService.claim_reward`를 `RewardService.deliver(commit=False)` 기반으로 리팩토링. `CASH_UNLOCK`→`POINT` 통합. `accrue_mission_reward` 제거.
    - [x] `AdminUserOpsService`: 수동 지급 경로 확인.
    > **[Memo]** `AdminVaultOpsService` 잔액 수정 시 `UserCashLedger` 기록 추가. `cash_balance` 직접 지급 경로는 제거됨.

---

## 2. 백엔드 스키마 (6 Items)
- [x] **2-1. 어드민 API 스키마 (`app/schemas/admin_*.py`)**
    - [x] `admin_roulette.py`: `reward_type` 주석(`POINT=금고 적립`, `GAME_XP=시즌 XP`).
    - [x] `admin_lottery.py`: 동일 주석 추가.
    - [x] `admin_dice.py`: 동일 주석 추가.
    - [x] `admin_season.py`: 레벨 보상 `reward_type` 주석 추가.
    - [x] `mission.py`: 미션 보상 `reward_type` 주석 추가.
    - [x] `game_tokens.py`: 게임 로그 `reward_type` 주석 추가.
    > **[Memo]** Enum 설명에 GAME_XP/금고 POINT 명시.

---

## 3. 어드민 프론트엔드 (17 Items)
- [x] **3-1. 공통 상수 (`src/admin/constants/rewardTypes.ts`)**
    - [x] `REWARD_TYPES` 업데이트:
        - `POINT` → "금고 적립(POINT)"
        - `GAME_XP` → "게임 경험치(XP)"
        - `CC_COIN_GIFTICON` 추가
        - `CASH_POINT` (legacy) 제거/미노출
- [x] **3-2. 설정 페이지 UI (`src/admin/pages/*.tsx`)**
    어드민 전역 드롭다운이 REWARD_TYPES 갱신 버전(GAME_XP, CC_COIN_GIFTICON)을 모두 반영. 별도 코드 수정 없이 노출 확인.
    - [x] `RouletteConfigPage.tsx`: 보상 드롭다운 교정 + 기프티콘 브랜드/커스텀 입력(재고 필드 후속).
    - [x] `LotteryConfigPage.tsx`: 보상 드롭다운 교정 확인(GAME_XP/CC_COIN_GIFTICON 노출).
    - [x] `DiceConfigPage.tsx`: 보상 드롭다운 교정 확인(GAME_XP/CC_COIN_GIFTICON 노출).
    - [x] `SeasonListPage.tsx`: 시즌 레벨 보상 드롭다운 교정 확인.
    - [x] `AdminMissionPage.tsx`: 미션 보상 드롭다운 교정 확인.
    - [x] `SurveyAdminPage.tsx`: 설문 보상 드롭다운 교정 확인.
    - [x] `GameTokenLogsPage.tsx`: 게임 로그 테이블 라벨 교정(POINT/GAME_XP/GIFTICON 표준 라벨).
    > **[Memo]** REWARD_TYPES 기반 라벨 맵으로 금고/XP/기프티콘 지급대기 표기.
- [x] **3-3. 기프티콘 설정 UI**
    - [x] 브랜드/금액 입력 UI(프리셋+커스텀) 구현 — 룰렛 적용, 타 페이지 적용/재고 필드(빈칸=무제한) 미완.
    - [x] 재고 관리 필드(빈칸=무제한) 처리 및 GameTokenLogs 라벨 표준화.
    > **[Memo]** 복권 설정 재고 입력은 빈칸→null(무제한), 수량 입력 시 차감. 안내 문구 추가.
- [x] **3-4. API 클라이언트(`src/admin/api/*.ts`)**
    - [x] `adminRouletteApi.ts` 등 설정 API 타입/스키마 업데이트.

---

## 4. 유저 클라이언트 (30 Items)
- [x] **4-1. 게임 페이지 (Roulette, Dice, Lottery)**
    - [x] `RoulettePage.tsx`: 보상 결과 표시 (POINT→금고, GAME_XP→시즌 XP, 기프티콘=지급대기/보상함).
    - [x] `DicePage.tsx`: 보상 토스트 라벨 교정 (GAME_XP→시즌 XP).
    - [x] `LotteryPage.tsx`: 당첨/경품 리스트 보상 라벨 교정.
    - [x] `LotteryCard.tsx`: 카드 보상 라벨 교정 + 기프티콘 힌트.
    - [x] `api/*.ts`: (변경 없음) 응답 포맷은 기존 매핑 유지.
    - [x] `fallbackData.ts`: 모의 데이터 라벨/문자 깨짐 교정.
- [x] **4-2. 금고 (Vault)**
    - [x] `VaultPage.tsx`: (변경 없음) 컴팩트 페이지 유지.
    - [x] `VaultMainPanel.tsx`: 문구 교정(금고 적립/해금/출금 신청 관점).
    - [x] `VaultAccrualModal.tsx`: (변경 없음) 금고 적립 토스트 유지.
    - [x] `api/vaultApi.ts`: (변경 없음) 금고 상태 API 연계 유지.
- [x] **4-3. 미션/출석/골든아워**
    - [x] `MissionPage.tsx`: 보상 타입(XP/금고/기프티콘) 구분.
    - [x] `MissionCard.tsx`: 미션 카드 UI.
    - [x] `AttendanceStreakModal.tsx`: 스트릭 보상 표시.
    - [x] `GoldenHourPopup.tsx`: 배율 적용(XP vs 금고) 명시.
    - [x] `GoldenHourTimer.tsx`: 타이머 UI.
    - [x] `stores/missionStore.ts`: 미션 상태 관리.
    - [x] `InventoryPage.tsx`: 기프티콘(배민, 씨씨코인) 노출 + `{BRAND}_GIFTICON_{금액}` fallback (2026-01-06).
    - [x] `ShopPage.tsx`: 다이아/티켓 판매·보상 변경 반영, 기프티콘 지급 루트 제외 (2026-01-06).
- [x] **4-5. 시즌패스**
    - [x] `SeasonPassPage.tsx`: 시즌 레벨 보상 표시.
    - [x] `SeasonProgressWidget.tsx`: XP 게이지/레벨 표시.
    - [x] `api/seasonPassApi.ts`: API 클라이언트
    > **[Memo]** 시즌패스 보상 타입 라벨 표준화, XP 게이지 max/0 분모 예외 처리, 레벨 카드에 보상 타입 칩 추가.
- [ ] **4-6. 설문**
    - [x] `src/pages/SurveyListPage.tsx`/`src/pages/SurveyRunnerPage.tsx`: 설문 보상 표시(금고/XP/기프티콘 대기) (2026-01-06).
    - [x] `src/utils/rewardLabel.ts`: 공통 보상 라벨 formatter 추가 (2026-01-06).
    - [x] `src/admin/pages/GameTokenLogsPage.tsx`: 게임토큰 로그 보상 라벨 표준화(금고/기프티콘) (2026-01-06).

---

## 5. 시드 데이터/배포 설정 (10 Items)
- [x] **5-1. 시드 스크립트 수정**
    - [x] `scripts/seed_test_data.py`: (로컬/스테이징) 룰렛/복권 기본 보상 타입 교정 (POINT=금고, XP=`GAME_XP`).
    - [x] `app/services/roulette_service.py`: (TEST_MODE) 기본 세그먼트 `reward_type` 교정 (`GAME_XP` 포함).
    - [x] `scripts/seed_missions.py`: 기본 미션 보상 타입/XP(`xp_reward`) 교정.
    - [x] `scripts/seed_daily_gift_mission.py`: 일일선물 미션 시드/업데이트 교정.
    - [x] `scripts/seed_game_*.py`: 기타 게임 설정/제한 시드 교정.
    > **[Memo]** 운영 DB 교정은 5-2 스크립트가 SoT이며, 5-1은 신규/로컬 환경 부트스트랩 성격(운영 직접 실행 필수 아님).
- [x] **5-2. 배포 실행 (Migrations/Scripts)**
    - [x] 기존 운영 DB 시드/설정 교정 배포 스크립트 작성 (`scripts/deploy_update_game_config_v3.py`).
    - [x] Post-check 검증쿼리(운영 DB 실행 후 로그/캡처 보관):
      ```sql
      -- ROULETTE: GAME_XP 세그먼트 존재 확인
      SELECT COUNT(*) AS cnt_game_xp
      FROM roulette_segment s
      JOIN roulette_config c ON c.id = s.config_id
      WHERE c.is_active = TRUE AND s.reward_type = 'GAME_XP';

      -- LOTTERY: GAME_XP 프라이즈 존재 확인
      SELECT COUNT(*) AS cnt_game_xp
      FROM lottery_prize p
      JOIN lottery_config c ON c.id = p.config_id
      WHERE c.is_active = TRUE AND p.reward_type = 'GAME_XP';

      -- DICE: 보상 타입이 허용값인지 확인
      SELECT id, win_reward_type, draw_reward_type, lose_reward_type
      FROM dice_config
      WHERE is_active = TRUE
      LIMIT 5;
      ```
    - [x] 어드민/환경 설정 점검 및 확인:
        - `docker-compose.yml`에서 `ENABLE_VAULT_GAME_EARN_EVENTS=true`, `ENABLE_TRIAL_PAYOUT_TO_VAULT=true` 확인
        - `XP_FROM_GAME_REWARD=false` 유지(레거시 플래그는 OFF)

---

## 6. 데이터 마이그레이션 (7 Items)
- [x] **6-1. 사전 준비**
    - [x] DB 백업 최신성 확보 (운영자 수행).
    - [x] 금고/캐시 잔액 추출 쿼리 작성 (스크립트 내 포함).
- [x] **6-2. 이관 스크립트**
    > **[Memo]** 백업 완료: `db_backup_20260106_063320.sql.gz` (2026-01-06 15:33 KST)
    - [x] `cash_balance` → `vault_locked_balance` 이관 로직 구현 (`scripts/migrate_cash_to_vault.py`).
    - [x] Ledger 기록 (`CASH_TO_VAULT_MIGRATION`) 구현.
    - [x] 멱등성키(`idempotency_key`) 활용 (잔액 0원 체크로 대체).
- [x] **6-3. 실행 및 검증**
    - [x] Dry-run 리포트(총액 산출 포함, 스크립트 기능).
    - [x] 실제 실행 (스크립트 제공).
    - [x] Post-check 검증쿼리 (스크립트 내 로직).

---

## 7. 테스트 (9 Items)
- [ ] **7-1. Unit Test**
    - [ ] `RewardService` 분기 처리 테스트(금고/XP/기프티콘/티켓).
    - [ ] `VaultService` 즉시 적립 테스트.
- [ ] **7-2. Integration Test**
    - [ ] 룰렛/주사위/복권 플레이 시 금고/XP/기프티콘 정상 적립 확인.
    - [ ] 골든아워 배율이 금고 적립에만 적용되는지 확인.
    - [ ] 키 룰렛 POINT 변환 경로 확인.
- [ ] **7-3. E2E Test**
    - [ ] 어드민 설정 변경 후 게임 플레이 → 보상 적립 로그 확인 시나리오.
    - [ ] 기프티콘 보상 설정 후 미션 클레임 + 인벤토리 적립 시나리오.

---

## 8. 배포 후 점검 (8 Items)
- [ ] **8-1. 메트릭/모니터링**
    - [ ] 금고 적립 건수/총액 변동 모니터링.
    - [ ] GAME_XP 적립 건수.
    - [ ] 기프티콘 지급대기 발생 건수.
    - [ ] RewardService 에러율.
- [ ] **8-2. QA/UX 테스트**
    - [ ] 어드민 보상 설정/조회 화면 수동 점검.
    - [ ] 게임/미션/시즌패스 보상 렌더링 UX 확인.

---
**전체 체크 수**: 100개  
**업데이트**: 2026-01-06
