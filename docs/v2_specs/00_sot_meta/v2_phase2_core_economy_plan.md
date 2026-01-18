문서 타입: 구현 계획 (Implementation Plan)
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: BE/FE 개발팀
상태: Draft

# Phase 2: Core Economy Implementation Plan (코어 경제 및 금고 로직)

## 1. 개요 (Overview)
V2 마이그레이션의 핵심인 "돈과 아이템"의 무결성을 확보하는 단계이다.
기존 V1의 **금고 잔액 이중 계산(Double Counting)** 문제를 영구적으로 해결하고, 상점 구매와 인벤토리 지급의 **원자성(Atomicity)**을 보장하는 것이 최우선 목표이다.

## 2. 해결 과제 (Key Challenges)
1.  **Vault Double Counting**: `locked`와 `available` 잔액이 혼재되어 어드민/유저 뷰에서 자산이 뻥튀기되는 현상.
2.  **Transaction Integrity**: 구매 도중 오류 발생 시 재화만 차감되거나 아이템이 지급되지 않는 문제.
3.  **Legacy Code**: `GameTokenType` 및 `Shop` 로직이 V1 레거시와 섞여 있어 정리가 필요함.

## 3. 구현 전략 (Implementation Strategy)

### 3.1 TDD First (테스트 주도 개발)
모든 경제 로직은 **실패하는 테스트 케이스**를 먼저 작성한 후 구현한다.
- **Coverage**: 입금, 출금, 구매, 환불, 동시성(Concurrency).

### 3.2 Single Source of Truth Enforcement
- **Vault**: `User.vault_locked_balance`만 유효한 잔액으로 취급. `available` 및 `vault_balance`은 무시하거나 Sync 전용으로 격하.
- **Inventory**: `UserGameWallet`(Token)과 `UserInventoryItem`(Item)의 엄격한 분리 구현.

### 3.3 Atomic Transaction Service
- **`ShopService.purchase()`**: 단일 트랜잭션 내에서 `Vault차감 -> ShopLog생성 -> Inventory지급` 수행.
- **`VaultService.deposit/withdraw()`**: `AuditLog` 생성과 잔액 변경을 Atomic하게 수행.

---

## 4. 상세 구현 항목 (Implementation Items)

### 4.1 Vault Consistency (금고 정합성)
*   **Target**: `app/services/v2/vault_service.py`
*   **Rules**: [v2_strict_vault_policy_sot_ko.md](../01_core/v2_strict_vault_policy_sot_ko.md)
*   **Tests**:
    - `test_vault_consistency.py`: Double Counting 시나리오 재현 및 방어.
    - `test_vault_concurrency.py`: 따닥 입/출금 방어.

### 4.2 Shop & Inventory (상점 및 인벤토리)
*   **Target**: `app/services/v2/shop_service.py`
*   **Rules**: [v2_shop_exchange_policy_sot_ko.md](../01_core/v2_shop_exchange_policy_sot_ko.md)
*   **Tests**:
    - `test_shop_atomicity.py`: 잔액 부족, 재고 부족, 트랜잭션 롤백 테스트.
    - `test_item_delivery.py`: 티켓/바우처 지급 정확성 검증.

### 4.3 Admin / UI Corrections
*   **Target**: Admin API (`app/api/admin/routes/admin_users.py`), FE (`VaultAdminPage`)
*   **Action**:
    - `vault_available_balance` 표시 제거.
    - `Total Balance` 계산 로직 수정 (`locked` only).

### 4.4 Withdrawal Logic Improvement (출금 조건 개선)
*   **Issue**: 게임 플레이 등 다양한 활동 트리거가 반영되지 않아 출금이 불필요하게 막힘.
*   **Action**: `VaultService.check_eligibility()`에 다양한 Activity Signal 연동.
    - `User.play_streak` (게임 플레이)
    - `UserMissionProgress` (미션 완료)
    - `EventParticipation` (이벤트 참여)

### 4.5 Reward System Integrity (보상 적립 오류 수정)
*   **Issue**: 신규 이벤트/미션 보상이 금고(Vault) 금액으로 적립되지 않는 현상.
*   **Action**: `RewardService`가 `POINT` 타입 보상 처리 시 반드시 `VaultService.deposit()`을 호출하도록 강제.
    - `v2_reward_type_standard_sot_ko.md` 기준 매핑 검증.

### 4.6 Golden Hour Logic (배수 적용 오류 수정)
*   **Issue**: 골든아워 배수가 어드민 설정과 다르게 적용됨.
*   **Action**: `GameService`/`RewardService` 내 배수 연산 로직 디버깅.
    - Admin Config(`GoldenHourPolicy`) 로드 시점 및 캐싱 데이터 확인.
    - `apply_multiplier(base_amount, policy)` 함수 TDD 검증.

---

## 5. 검증 계획 (Verification Plan)
1.  **Automated Tests**: `pytest tests/v2/core` 실행 및 Pass 확인.
2.  **Manual Verification**:
    - 어드민 페이지에서 유저 금고 잔액 확인 (DB 직접 조회와 비교).
    - 상점 구매 시 잔액 차감과 아이템 지급이 동시에 일어나는지 확인.
    - 강제 예외 발생 시 롤백 여부 확인.

## 6. 일정 (Schedule)
- **Day 1**: TDD Setup & Vault Consistency Fix.
- **Day 2**: Shop/Inventory Atomic Service Implementation.
- **Day 3**: UI/Admin Integration & Verification.

---

## 7. 부록: 최근 트러블슈팅 로그 (Since 1/10)
**유저 피드백 및 개발 로그 기반의 금고 관련 이슈 모음입니다. 구현 시 필히 참조하여 회귀(Regression)를 방지해야 합니다.**

### 7.1 금고 잔액 표시 불일치 (Double Counting / Display Mismatch)
*   **Log**: [20260115_admin_vault_history_balance_display.md](../08_changelog/20260115_admin_vault_history_balance_display.md)
*   **Issue**: 어드민 금고 내역 모달에서 '과거 내역'만 보이고 '현재 잔액'이 안 보이거나, `available`과 `locked`가 혼재되어 계산됨.
*   **Resolution**:
    - 어드민 모달 헤더에 `locked_balance` 기반의 **"현재 누적 금고액"** 표시 추가.
    - `UseQuery` 병렬 호출로 최신 잔액 즉시 동기화.

### 7.2 출금 티어(Tier) 로직 파편화
*   **Log**: [20260117_vault_withdrawal_tier_fix.md](../08_changelog/20260117_vault_withdrawal_tier_fix.md)
*   **Issue**: 문서(1회 1만->2회 3만)와 실제 운영(1회 1만->2회 1만->3회 3만->4회 5만) 정책 불일치. FE 하드코딩으로 인해 버튼이 잘못 비활성화됨.
*   **Resolution**:
    - **Backend**: `withdrawal_count` (PENDING+APPROVED) 기반 동적 검증 로직 구현.
    - **Frontend**: `WithdrawalProgressModal` 및 진입 버튼에서 서버 티어 정보를 받아 동적으로 최소 금액 안내.

### 7.3 보상 동기화 (Lottery/Dice)
*   **Log**: [20260117_vault_withdrawal_tier_fix.md](../08_changelog/20260117_vault_withdrawal_tier_fix.md), [20260114_dice_reward_config_vault_display_fix.md](../08_changelog/[20261월둘째주]dev_log_20260114_dice_reward_config_vault_display_fix.md)
*   **Issue**:
    - 복권 당첨 후 인벤토리/헤더 재화가 즉시 갱신되지 않음 (`invalidateQueries` 누락).
    - Dice 어드민 설정값(`WIN=1000`)이 금고 적립 시 무시되고 전역 설정(`game_earn_config`)이 우선되는 버그.
*   **Resolution**:
    - `useLottery.ts` onSuccess 시 `inventory`, `vault-status` 쿼리 무효화.
    - `VaultService` 적립 로직에서 `DiceConfig` 값 우선 순위 조정.

### 7.4 상점 상품 노출 지연
*   **Log**: [20260114_dice_reward_config_vault_display_fix.md](../08_changelog/[20261월둘째주]dev_log_20260114_dice_reward_config_vault_display_fix.md) (Section 9)
*   **Issue**: 어드민에서 상품 추가 후 유저 화면에 즉시 노출되지 않음 (Auto-save 부재).
*   **Resolution**: 상품 Create/Update 시점즉시 서버 저장(PUT) 및 캐시 무효화.

