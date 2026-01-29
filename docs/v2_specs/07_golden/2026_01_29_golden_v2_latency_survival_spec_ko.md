# Golden V2: 입금 지연 극복 (Latency Survival) 스펙 (v1.2)

**문서 타입**: 기술 사양서 (Specification)
**작성일**: 2026-01-29
**상태**: Draft
**프로젝트**: Golden V2 (Phase 4-Early)

---

## 1. 개요 (Overview)

외부 데이터 입고 지연(4~12시간)으로 인한 유저 불편을 해소하기 위해, **유저가 제출한 증거(TX ID)**를 기반으로 **기존 재화(티켓 등)를 선지급(Provisional Grant)**하고 **사후 검증(Post-Verification)**하는 시스템입니다.

**핵심 원칙**:
1.  **신규 재화 없음**: `ROULETTE_TICKET`, `DIAMOND` 등 기존 재화를 선지급 보상으로 활용한다.
2.  **어드민 검증**: 자동 매칭의 한계를 인정하고, 어드민이 시각적 도구를 통해 수동 매칭/회수한다.
3.  **제재 예외**: 증거 제출 시 `Strict Vault Policy`의 제재를 일시적으로 유예하여 활동을 보장한다.

---

## 2. 상세 충돌 지점 및 해결 전략 (Conflict Analysis & Resolution)

시스템 도입 시 예상되는 충돌 및 위험 요소를 6가지 관점에서 분석하고 해결책을 정의합니다.

### 2.1 [Policy] 선지급 vs 혜택 중단 (Benefit Suspension)
- **충돌**: 7일 무입금 유저는 `Strict Vault Policy`에 의해 상점 이용이 차단되므로, 선지급 보상을 받아도 사용할 수 없음.
- **해결**: `VaultService.is_benefits_suspended` 로직에 예외 추가.
    - **Provisional Bypass**: 최근 24시간 내 유효한(`PENDING`, `PROVISIONAL`) 증거가 존재하면 제재 상태(`True`)를 `False`로 오버라이딩.
    - **TTL**: 증거 제출 시각으로부터 **최대 24시간**까지만 예외 인정.

### 2.2 [Schema] 유저 증거 vs 실제 원장 (Data Integrity)
- **충돌**: 유저가 주장하는 금액과 실제 입금 `delta`가 다를 수 있음. 1:1 매칭 불가.
- **해결**: **Soft Link & Admin Decision**.
    - DB FK(`matched_log_id`)는 `NULLable`로 설정.
    - 어드민이 **"이 입금이 그 증거 맞음"**이라고 판단하면 금액 차이가 있어도 매칭 승인 가능 (차액 사유 기록).

### 2.3 [Concurrency] 중복 제출 및 따닥 요청 (Race Condition)
- **충돌**: 동일 TX ID 중복 제출 또는 네트워크 지연으로 인한 다중 선지급 시도.
- **해결**: 
    - **DB Unique Index**: `v2_user_deposit_evidence(tx_id)` 설정.
    - **Idempotency**: API 호출 시 `Idempotency-Key` 필수.
    - **Rate Limit**: 유저당 1시간 내 3회 제출 제한.

### 2.4 [Abuse] 허위 제출 및 먹튀 (Fraud & Risk)
- **충돌**: 허위 TX 제출 후 선지급 보상만 챙기고 사용해버림.
- **해결**: 
    - **Clawback**: 반려 시 선지급 재화 즉시 차감. 잔액 부족 시 0으로 만들고 **부채(Debt)** 로그 기록.
    - **Trust Score**: 반복적인 반려 유저는 Latency Survival 기능 영구 차단.
    - **선지급 한도**: 1회 제출 시 `ROULETTE_TICKET` 5장 등 소량으로 제한.

### 2.5 [Ops] 어드민 업무 과부하 (Operational Overhead)
- **충돌**: 다수의 증거 제출 시 수동 매칭 업무 가중.
- **해결**: **Assisted Matching UI**.
    - 시스템이 `유저 ID`, `시각(±3시간)`, `금액(±10%)` 기준으로 후보를 추천.

### 2.6 [Technical] 외부 데이터 지연 심화 (External Dependency)
- **충돌**: 24시간 이상 지연 시 TTL 만료로 유저 다시 차단.
- **해결**: **Emergency Extension**. 어드민 Config로 TTL 일괄 연장 기능 제공.

---

## 3. 데이터베이스 스키마 (Schema)

### 3.1 `v2_user_deposit_evidence`

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | PK | Auto Increment |
| `user_id` | FK | `v2_user.id` |
| `tx_id` | String | 유저가 입력한 TX Hash (Unique Index) |
| `image_url` | String | (Optional) 업로드한 스크린샷 경로 |
| `claimed_amount` | Integer | 유저 주장 입금액 |
| `status` | Enum | `PENDING`, `PROVISIONAL`, `VERIFIED`, `REJECTED` |
| `reward_json` | JSON | 선지급된 재화 내역 (`{"ROULETTE_TICKET": 5}`) - 회수용 |
| `admin_memo` | String | 반려/승인 메모 |
| `matched_log_id`| FK | `v2_cc_deposit_log.id` (Nullable - 승인 시 매핑) |
| `created_at` | DateTime | 제출 시각 (TTL 기준) |
| `verified_at` | DateTime | 검증 완료 시각 |

---

## 4. 핵심 정책 및 로직 (Core Logic & Policy)

### 4.1 선지급 정책 (Provisional Grant Policy)
- **대상**: 입금 확인이 지연되는 모든 유저 (제재 유저 포함).
- **보상 내용**: `ROULETTE_TICKET` 5장 (Config로 조정 가능).
- **지급 시점**: `submit_evidence()` API 호출 시 즉시 지급 (Risk 유저는 어드민 확인 후 지급).
- **회수(Clawback)**: `REJECTED` 처리 시 `InventoryService.consume_wallet_tokens`를 호출하여 강제 회수.

### 4.2 중복 지급 방지 (Deduplication)
- 실제 CC 입금(`v2_cc_audit_log`)이 도착했을 때, **선지급된 티켓은 회수하지 않음** (유저 만족도 고려).
- 단, 해당 증거 상태를 `VERIFIED`로 변경하여 관리 완료 처리함.

### 4.3 로그 정책 (Log Types)
- **선지급**: `InventoryLogType.LATENCY_PROVISIONAL` (신규 Enum 추가 필요)
- **회수**: `InventoryLogType.LATENCY_CLAWBACK` (신규 Enum 추가 필요)
- **목적**: 선지급 및 회수 내역을 일반 지급과 구분하여 경제 지표 왜곡 방지.
- **Alembic 주의**: Postgres Enum 변경은 자동 감지되지 않으므로, Migration 파일에 `op.execute("ALTER TYPE inventorylogtype ADD VALUE '...'")` 구문을 수동으로 작성해야 함.

### 4.3 제재 예외 처리 (Benefit Suspension Bypass)
- **로직**: `VaultService.is_benefits_suspended(user_id)` 호출 시 다음 조건을 추가 체크.
- **조건**: `v2_user_deposit_evidence` 테이블에 `user_id`가 일치하고, `status`가 `PENDING` 혹은 `PROVISIONAL`이며, `created_at`이 현재로부터 24시간 이내인 레코드가 **하나라도 존재하면** `False` (정상 이용 가능) 반환.

---

## 5. 서비스 인터페이스 (Service Interface)

### 5.1 `V2LatencySurvivalService`
- **`submit_evidence(user_id, tx_id, claimed_amount)`**
    - 증거 저장, 중복 및 Abuse 체크, 선지급 실행.
- **`verify_evidence(admin_id, evidence_id, log_id)`**
    - 매칭 승인. `status=VERIFIED`. `matched_log_id` 업데이트.
- **`reject_evidence(admin_id, evidence_id, reason)`**
    - 반려 처리. `status=REJECTED`. 선지급 보상 회수 로직 실행.

### 5.2 `V2VaultService` (수정)
- **`is_benefits_suspended(user_id)`**
    - 기존 로직(7일 무입금) + **증거 기반 예외 처리(Bypass)** 로직 통합.

---

## 6. Admin & UX

### 6.1 User (TMA)
- **Evidence Submission Page**:
    - TX ID 입력 필드, "제출하고 티켓 받기" 버튼.
    - 안내 문구: "허위 제출 시 이용이 영구 제한될 수 있습니다."
- **Status Indicator**:
    - "입금 확인 중 (티켓 사용 가능)" 뱃지 및 인디케이터 표시.
    - 선지급 완료 시 푸시 알림 또는 팝업.

### 6.2 Admin (Backoffice)
- **Deposit Verification Dashboard**:
    - **UI 구조**: Split View (좌: 증거 목록 / 우: 입금 로그).
    - **Smart Match**: 선택한 증거와 유사한 입금 로그(금액, 시간)를 하이라이팅.
    - **Action**: 승인(Match) 및 반려(Reject/Clawback) 버튼 권한 제어.
