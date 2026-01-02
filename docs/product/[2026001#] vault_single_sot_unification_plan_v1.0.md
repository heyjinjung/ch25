# 금고(Vault) 단일 SoT 일원화 해결 계획

문서 타입: 설계 / 가이드 / 체크리스트
버전: v1.3
작성일: 2026-01-02
작성자: BE팀(초안, Copilot)
대상 독자: BE 개발자, FE 개발자, PO, QA

## Purpose
현재 금고 보상이 `vault_locked_balance`(잠금)와 `cash_balance`(출금 가능)로 이원화되어 있고, 여러 경로(금고 해금, 시즌패스 보상, 미션 해금, 출금 요청)가 서로 다른 필드/장부를 만지면서 정책 의도(“금고에 보이는 누적 적립액이 조건 충족 시 바로 유저에게 보이게 올라간다”)가 지속적으로 꼬이는 문제가 발생한다.

본 문서는 **“금고 금액 SoT를 단 하나로 유지”**하는 것을 목표로, 백엔드/프론트/DB/테스트의 단계별 변경 계획을 제시한다.

## Scope
- 포함
  - Vault 금액의 단일 SoT 정의 및 API 계약 개편
  - 출금(신청/승인/반려) 플로우를 단일 SoT 기준으로 재설계
  - 시즌패스/미션/리워드 지급 경로에서 “금고 금액 적립”의 단일화
  - 레거시 호환(점진적 마이그레이션) 및 데이터 이관
  - QA/검증 체크리스트(자동 테스트/수동 시나리오)
- 제외(이번 계획에서는 하지 않음)
  - Vault2(Phase 2/3 bookkeeping) 기능 확장
  - 새로운 UI 기능 추가(필요 최소한의 표시/문구 수정만)
  - 경제 정책(수치/조건) 자체 변경

## Definitions
- SoT(Source of Truth): “유저 금고 금액”의 기준이 되는 단 하나의 저장소(필드/테이블)
- VaultAmount: 유저가 금고 화면에서 보는 누적 적립액(게임/리워드로 증가)
- Reserved/Pending: 출금 신청 등으로 인해 실제로 사용(출금) 처리 중이라 잠시 보류되는 금액

## 1. 현 상태(As-Is) 요약

### 1.1 저장 구조
- `user.vault_locked_balance`: 게임 적립/패널티의 Phase 1 SoT로 사용됨
- `user.cash_balance`: 해금/관리자 지급/일부 보상에서 증가, 출금 신청 시 감소
- `user_cash_ledger`: `cash_balance` 변동 로그(`VAULT_UNLOCK`, `VAULT_WITHDRAWAL_REQUEST`, `MISSION_UNLOCK`, `LEVEL_BUNDLE_*` 등)

### 1.2 주요 흐름(대표)
- 게임(룰렛/주사위) 적립: `VaultService.record_game_play_earn_event()` → `vault_locked_balance` 변동
- 해금(입금/조건 달성): `VaultService.handle_deposit_increase_signal()` 또는 VIP 로직 → `RewardService.grant_point()` → `cash_balance` 증가
- 시즌패스 보상: `SeasonPassService` → `RewardService.deliver()` → (POINT/BUNDLE 케이스) `cash_balance` 증가 가능
- 미션(CASH_UNLOCK): `MissionService.claim_reward()` → `vault_locked_balance` 감소 + `cash_balance` 증가
- 출금: `/api/vault/withdraw` → `cash_balance` 감소 + 요청 테이블 생성

### 1.3 사용자 의도(To-Be와의 갭)
사용자가 원하는 UX/정책:
- “금고에 보이는 누적 적립액”이 단일 기준으로 누적되며
- 조건 충족 시 바로 ‘출금 신청 가능’ 상태가 되더라도 **표시/수치/기준이 갈라지지 않음**

현재 문제:
- 동일한 가치(금고 보상)가 `vault_locked_balance`와 `cash_balance`로 분산되어,
  - 화면에 보이는 값과 출금 가능한 값이 분리되어 설명/검증/운영이 어려움
  - 리워드/시즌/미션 플로우가 서로 다른 필드에 적립하여 회귀 가능성이 큼

## 2. 목표(To-Be): 단일 SoT 설계

### 2.1 핵심 결정
- **VaultAmount SoT는 `user.vault_locked_balance` 하나로 통일한다.**
- `cash_balance`는 Vault 경제(금고) 흐름에서 **더 이상 사용하지 않는다(Deprecated).**
  - (예외) 운영/레거시 호환을 위해 일정 기간 유지하되, 신규 로직에서는 write 금지

### 2.2 단일 SoT에서 필요한 개념(Reserved)
출금 플로우가 존재하므로, 단일 금액에서 “신청 중/보류”를 표현해야 한다.

권장 방식(추가 필드 없이도 가능):
- **총 금고 금액 = `vault_locked_balance`**
- **예약(Reserved) 금액 = `vault_withdrawal_request` 중 PENDING 합산**
- **출금 가능(Available) = vault_locked_balance - reserved**

이 방식은 “SoT는 하나(총액)”를 유지하면서, 운영 상태(보류)를 별도 테이블로 관리한다.

### 2.3 API 계약(권장)
- `/api/vault/status` 응답은 다음을 명시적으로 제공한다.
  - `vault_amount_total` (== `vault_locked_balance`)
  - `vault_amount_reserved` (== PENDING 합)
  - `vault_amount_available` (= total - reserved)
  - (레거시) `cash_balance`는 0 또는 deprecated 필드로 유지(단계적으로 제거)

## 3. 백엔드 변경 계획

### 3.1 VaultService 책임 재정의
- Vault는 “적립/패널티/해금/출금”을 모두 `vault_locked_balance` 중심으로 일원화한다.
- `RewardService.grant_point()`를 통해 `cash_balance`로 이동시키는 해금 로직을 제거/대체한다.

구체 변경 방향:
1) 해금(Unlock)의 의미를 “locked → cash” 변환이 아니라
   - “available 상태로 전환(= reserved 계산에 반영되지 않는 상태)”로 재해석한다.
2) 따라서 해금 시점에도 `vault_locked_balance`는 그대로 유지(총액 SoT 유지)
   - 대신 출금 조건/규칙에 의해 `available` 계산이 달라지도록 한다.

주의: 현재 코드에는 `vault_locked_expires_at`, eligibility, deposit-today 같은 제약이 존재한다.
- 이 제약들은 “출금 가능 여부” 판단으로 이관/정리한다.

### 3.2 출금(Withdraw) 플로우 재설계
현재: withdraw 요청 시 `cash_balance`에서 차감.

To-Be(권장):
- 요청 생성 시점에는 **`vault_locked_balance`를 차감하지 않는다**.
- 대신 `vault_withdrawal_request`를 만들고, `reserved`로만 잡는다.
- 승인(APPROVE): 실제 외부 지급 처리가 완료되면 그 시점에
  - `vault_locked_balance -= amount` (총액 감소)
  - 요청 상태를 APPROVED
- 반려(REJECT):
  - `vault_locked_balance`는 변하지 않음(이미 차감하지 않았으므로)
  - 요청 상태를 REJECTED

이렇게 하면 “단일 SoT + 예약 테이블”로 동시성/중복 신청을 제어할 수 있다.

동시성 제어(필수):
- PENDING 합산을 계산할 때와 요청을 생성할 때 동일 트랜잭션에서
  - User row lock 또는 request 테이블에 대한 적절한 락(환경별)을 사용
  - `available >= amount` 검증 후 insert

### 3.3 시즌패스/미션/리워드의 일원화
문제의 핵심은 “돈 같은 것(포인트/현금성)이 어느 필드로 쌓이냐”가 분산된 것이다.

권장 규칙:
- 금고 관련 ‘가치’는 모두 `vault_locked_balance`로 적립한다.
- `RewardService.deliver()`의 `POINT`/`BUNDLE`에서 발생하는 현금성 지급은
  - Vault 적립으로 라우팅(예: `VaultService.accrue_reward(...)` 같은 단일 진입점)
  - cash_balance로의 적립은 운영/관리자 전용 경로로만 제한

구체 항목:
- 시즌패스 보상 중 “포인트 지급”은 `vault_locked_balance += amount`로 통일
- 미션 `CASH_UNLOCK`은 “locked 감소 + cash 증가”가 아니라
  - 단일 SoT 관점에서 **그냥 `vault_locked_balance`를 증가시키는 보상**으로 바꾸거나
  - (정책상 ‘해금’ 의미가 필요하면) 별도 상태/플래그로 available 조건을 충족시키는 방식으로 변경

중요: 이 문서에서는 정책 변경을 하지 않지만, 현재 구현은 “locked→cash 이동” 자체가 정책으로 내장되어 있어
단일 SoT로 가려면 ‘해금’의 의미를 재정의해야 한다.

## 4. 프론트엔드 변경 계획

### 4.1 화면에서 단일 금액을 보여주기
- 금고 화면에서 ‘누적 적립액’은 `vault_amount_total`(= locked)을 보여준다.
- 출금 CTA는 `vault_amount_available` 기준으로 enable/disable한다.

변경 대상 예:
- VaultPageCompact: `cashBalance` 기반 출금 UI를 `vaultAmountAvailable` 기반으로 변경
- VaultMainPanel: 문구/표시가 locked/cash를 혼용하지 않도록 정리

### 4.2 API 호환 단계
단계적 릴리즈를 위해, 1차 배포에서는
- 서버가 `cash_balance`를 계속 내려주되(레거시),
- 프론트는 신규 필드(`vault_amount_total/available/reserved`)가 있으면 그걸 우선 사용

## 5. DB/데이터 마이그레이션 계획

### 5.1 스키마 변경(가능하면 최소)
권장: 스키마 추가 없이도 가능(Reserved는 요청 테이블 합산으로 표현).

선택 옵션(운영/성능상 필요 시):
- `user.vault_reserved_amount` 같은 캐시 필드를 추가(하지만 단일 SoT 원칙과 충돌 가능)
- 본 계획 v1.0에서는 **추가 필드 없이 진행**을 기본으로 한다.

### 5.2 기존 `cash_balance` 데이터 처리
의사결정 필요(둘 중 하나를 택해야 함):
- 옵션 A(권장): `cash_balance`를 Vault 경제에서 완전히 분리(0으로 수렴)하고,
  - 기존 `cash_balance`는 “legacy 출금 가능 잔고”로 남겨두되 더 이상 증가하지 않게 한다.
- 옵션 B(강제 일원화): 운영 중인 `cash_balance`를 `vault_locked_balance`로 이관
  - 1회성 마이그레이션: `vault_locked_balance += cash_balance; cash_balance = 0`
  - `user_cash_ledger`의 과거 로그는 유지(회계적 추적), 단 새 write는 중단

이 문서의 목적(“잠금액 하나만 설계”)에 가장 부합하는 것은 옵션 B이지만,
운영/회계/CS 관점에서 합의가 필요하다.

## 6. 단계별 롤아웃(가장 중요한 부분)

### Phase 0 — 진단/스냅샷(반드시)
- 현재 금고 관련 컬럼/테이블 사용처를 목록화
  - `user.vault_locked_balance`, `user.cash_balance`, `user_cash_ledger`, `vault_withdrawal_request`
- 샘플 유저 10명에 대해
  - locked/cash/withdraw_requests 상태 스냅샷을 남김

### Phase 1 — 백엔드: 신규 API 필드 제공(호환)
- [x] `/api/vault/status`에 `vault_amount_total/reserved/available` 추가
  - 호환: `available_balance`/`cash_balance`는 `vault_amount_available`을 반환(레거시 alias)
- [x] 출금 요청 생성 로직을 available 기반으로 변경(요청 시 금액 차감 없음)
  - 승인(APPROVE): `vault_locked_balance -= amount`
  - 반려(REJECT): 금액 변동 없음(예약 해제)
- [x] 자동 테스트 추가: `tests/test_vault_withdraw_reserved_flow.py`

완료 기준:
- [x] 신규 필드가 내려오고, 기존 프론트는 깨지지 않음

### Phase 2 — 프론트: cashBalance 의존 제거
- [x] 금고 UI에서 출금 기준을 `available_balance` 우선으로 전환(없으면 `cash_balance` fallback)
  - `src/components/vault/VaultPageCompact.tsx`
  - `src/components/vault/VaultMainPanel.tsx`

완료 기준:
- [x] 금고 화면에서 “누적 적립액(total)”이 단일 값으로 일관
- [x] 출금 버튼 enable/disable이 available 기반으로 정상

### Phase 3 — 백엔드: cash_balance write 차단
- [x] VIP lazy unlock이 status 조회에서 `locked → cash_balance`로 이동시키지 않도록 제거
- [x] 시즌패스 보상(메타 `source=SEASON_PASS*`)의 POINT/BUNDLE 포인트 지급을 `vault_locked_balance`로 라우팅
- [x] 미션 `CASH_UNLOCK`의 `locked 감소 + cash 증가` 경로 제거/대체
  - 구현: balance transfer를 제거하고, Vault2에 unlock 이벤트만 기록(관측/마이그레이션 준비용)
- [x] 입금/조건 달성 해금 로직(`VAULT_UNLOCK` 등)에서 `cash_balance` write 제거/대체
  - 구현: `handle_deposit_increase_signal()`에서 RewardService를 통한 cash 지급/전환을 중단(단일 SoT 기준). 향후 unlock 의미는 eligibility/withdraw rule로 재정의.

원칙:
- 금전성 지급은 `vault_locked_balance`로만 적립
- `cash_balance`는 운영/레거시 호환 목적 외 신규 write 금지

완료 기준:
- 운영 시나리오에서 cash_balance가 더 이상 증가하지 않음

### Phase 4 — 데이터 이관(선택)
- 옵션 B를 택한 경우(선택됨):
  - `cash_balance → vault_locked_balance` 일괄 이관 및 cash 0
  - 이관 스크립트:
    - `python scripts/migrate_cash_balance_to_vault_locked.py --dry-run`
    - `python scripts/migrate_cash_balance_to_vault_locked.py --apply`
  - 이관 이후 신규 로직이 단일 SoT로만 움직이는지 검증

### Phase 5 — 레거시 제거
- API 응답에서 `cash_balance` 제거(또는 deprecated 표기)
- 사용하지 않는 UI 문구/코드 제거

## 7. 테스트/QA 계획

### 7.1 자동 테스트(권장 추가/수정 포인트)
- Vault
  - 게임 적립(locked 증가) → status에서 total 즉시 반영
  - 출금 신청 1회 → reserved 증가, available 감소, total 유지
  - 출금 반려 → reserved 감소, available 원복, total 유지
  - 출금 승인 → reserved 감소, total 감소
- 시즌패스
  - 레벨업 자동 보상 지급 시 total 증가(포인트성 보상)
  - reward_log 중복 방지 유지

### 7.2 수동 시나리오(운영 관점)
1) 게임 플레이로 적립 → 금고 누적 확인
2) 조건 충족 후 출금 신청 → available 감소/보류 표시
3) 관리자 승인/반려 → 총액 변화/원복 확인

## 8. 운영상 주의
- “예약 기반 출금”으로 바꾸면, 승인 시점에 총액을 차감하므로
  - 승인 API는 반드시 멱등/락 처리 필요
  - 중복 승인/중복 반려 방지 필요
- 배포 순서(서버 먼저, 프론트 나중)로 호환성을 보장해야 한다.

## 9. Open Questions(결정 필요)
- Q1. 기존 `cash_balance`를 어떻게 처리할지(옵션 A vs B)
- Q2. ‘해금’의 의미를 어떤 UX로 보여줄지(총액은 같고 available만 바뀌는 것이 사용자에게 납득되는지)
- Q3. 시즌패스 “포인트” 보상을 금고 적립으로 볼지, 아니면 티켓/아이템으로만 유지할지

## 10. 변경 이력
- v1.3 (2026-01-02, BE팀): Phase 3 잔여 항목 반영(미션 CASH_UNLOCK/입금 unlock의 cash_balance write 차단)
- v1.2 (2026-01-02, BE팀): Phase 3 일부 진행 반영(시즌패스 포인트 vault 라우팅 + VIP lazy unlock cash write 제거)
- v1.1 (2026-01-02, BE팀): Phase 1~2 체크리스트 반영(Reserved 기반 출금 + 프론트 available 기준 전환)
- v1.0 (2026-01-02, BE팀): 초안 작성(단일 SoT + reserved 기반 출금 설계)

