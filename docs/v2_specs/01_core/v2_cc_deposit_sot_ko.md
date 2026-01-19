# CC 입금 및 외부 랭킹 연동 SoT (CC Deposit & External Ranking)

**문서 타입**: 정책 및 스키마 표준
**버전**: v1.1
**작성일**: 2026-01-19
**상태**: SoT (Source of Truth)

---

## 1. 목적 (Purpose)
- **CC**에서 집계된 유저의 입금/플레이 데이터를 V2 시스템으로 안전하게 동기화한다.
- **"누적 금액(Total Amount)"** 수신 시, **"순증분(Delta)"**을 정확히 계산하여 별도의 테이블로 관리한다.
- 이 문서는 V1의 `AdminExternalRankingService`를 대체하며, V2 Core Economy의 유일한 입금 경로이다.

## 2. 용어 정의 (Definitions)

| 용어 | 설명 | V2 매핑 |
| :--- | :--- | :--- |
| **CC** | 외부 랭킹/정산 시스템 (Source System) | - |
| **CC ID** | 외부 시스템에서의 유저 식별자 | `User.external_id` (가장 중요한 식별자) |
| **Total Deposit** | 가입 시점부터 현재까지의 총 입금 누적액 | `V2ExternalCCData.total_deposit` |
| **Deposit Delta** | 직전 동기화 대비 증가한 입금액 (실질 입금) | `VaultEarnEvent` (amount) |
| **Daily Net** | 당일 발생한 입금 순증분 (출금 조건용) | `V2ExternalDailyStat.net_deposit` (KST 기준) |

> **KST 기준**: 서버 시간대와 무관하게 모든 일자 계산(`Daily Net` 등)은 **한국 표준시(KST, UTC+9)** 기준으로 매핑 및 초기화한다.

---

## 3. 데이터베이스 스키마 (Database Schema)

### 3.1 V2ExternalCCData (상태 원장)
> 외부 시스템의 현재 상태(Snapshot)를 저장하는 테이블.

- **Table**: `v2_external_cc_data`
- **Fields**:
  - `user_id` (FK): V2 유저 ID
  - `cc_id`: 외부 유저 식별자 (`external_id`)
  - `nickname`: 외부 시스템 닉네임 (스냅샷용)
  - `total_deposit` (BigInt): 외부 수신 총 입금액
  - `total_play` (BigInt): 외부 수신 총 입금 횟수 (Play Count가 아닌 Deposit Count)
  - `last_synced_at` (DateTime): 마지막 서버 데이터 입력 시각 (KST)
  - `first_deposit_at` (DateTime): 최초 입금 감지 시각

### 3.2 V2CCDepositLog (처리 로그)
> 델타가 발생하여 실제 금고에 반영된 이력. (Audit/CS용)

- **Table**: `v2_cc_deposit_log`
- **Fields**:
  - `id` (PK)
  - `user_id` (FK)
  - `nickname`: 로그 생성 시점의 닉네임 (History 추적용)
  - `delta_amount` (Int): 순증분 (+실제 입금액)
  - `prev_total` (BigInt): 반영 전 총액
  - `new_total` (BigInt): 반영 후 총액
  - `vault_event_id` (FK): `v2_vault_event.id` 연결 (실제 자산 지급 내역과 1:1 매핑)
  - `created_at` (DateTime): 로그 생성 시각 (KST 기준 변환 저장 권장)

---

## 4. 동기화 로직 (Sync Logic)

### 4.1 입금 처리 흐름 (Deposit Flow)
1. **Payload 수신**: Admin API를 통해 `{cc_id, nickname, deposit_amount, deposit_count}` 리스트 수신.
2. **User Resolve**: `cc_id`를 최우선으로 유저 식별. 없으면 `nickname`으로 Fallback 검색 (동명이인 주의).
3. **Delta Calculation**:
   - `DB.total_deposit` (기존) vs `Payload.deposit_amount` (신규) 비교.
   - `delta = new - old`
   - **Constraint**: `new < old`인 경우, 데이터 오염으로 간주하여 **무시(Ignore)**. (감소 로그는 남기지 않음)
4. **Vault Reflection (Atomic Trx)**:
   - `delta > 0`인 경우:
     - 1) `User.vault_locked_balance` += `delta`
     - 2) `V2ExternalCCData` 업데이트 (`total_deposit`, `nickname`, `last_synced_at` 등)
     - 3) `VaultEarnEvent` 생성 (Type: `CC_DEPOSIT`) -> `vault_event_id` 획득
     - 4) `V2CCDepositLog` 기록 (`vault_event_id` 포함)
     - 5) 트리거 실행: 레벨 XP 지급 등.

### 4.2 당일 입금 인정 (Daily Recognition)
- **출금 조건**: V2 Strict Vault Policy에 따라 판별.
- **기준**: `V2ExternalCCData.last_synced_at`이 **오늘(KST 기준)**이어야 함.
- **보조 지표**: `V2ExternalDailyStat.net_deposit > 0` 여부도 함께 확인하여 "실제 입금 여부" 판단.

---

## 5. 보상 및 트리거 (Rewards & Triggers)

### 5.1 레벨 XP (Level XP)
- **규칙**: 입금 `100,000원` 당 `20 XP` (기본 설정값 참조).
- **로직**: `delta` 발생 시에만 계산하여 즉시 지급.
- **골든아워 제외**: 골든아워 배율은 적용하지 않는다. (입금액 자체는 순수하게 반영)

### 5.2 첫 충전 (First Deposit)
- `first_deposit_at`이 `NULL`인 상태에서 `delta > 0` 발생 시 값 갱신.
- 신규 유저 혜택 로직의 트리거로 활용.

---

## 6. 운영 정책 (Ops Policy)
- **수동 보정**: 데이터 불일치 등으로 어드민이 수동 개입 시, 반드시 `Reason`을 입력해야 하며 `ops_audit_log`에 기록된다.

---

## 7. 검증 (Verification)
- [ ] 0원 -> 10만원 동기화 시: 금고 +10만, 로그 생성 확인.
- [ ] 10만원 -> 10만원 동기화 시: 변동 없음, 로그 미생성 확인.
- [ ] 10만원 -> 20만원 동기화 시: 금고 +10만 (총 20만), 델타 로그 +10만 확인.
