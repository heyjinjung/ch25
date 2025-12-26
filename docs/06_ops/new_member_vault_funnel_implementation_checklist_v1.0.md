# 신규회원 금고 퍼널 구현 체크리스트 v1.1

- 기준 문서: [docs/06_ops/new_member_vault_funnel_plan_v1.0.md](./new_member_vault_funnel_plan_v1.0.md)
- 목적: 위 퍼널 문서의 **실제 기능 구현**을 위한 작업 목록/완료 기준/검증 항목을 한 장으로 관리
- 범위(v1.1):
  - 신규회원 주사위(LOSE) UX를 **‘전환(보호 시스템 → 금고 이동)’** 으로 통일하고, 최소 시드 10,000원을 `vault_locked_balance`에 보장
  - `vault_locked_balance`를 **단일 소스**로 사용하고 `vault_balance`는 legacy 미러(읽기 호환용)
  - `GET /api/vault/status`, `POST /api/vault/fill` 실제 응답 필드(locked/available/expires/unlock_rules_json) 반영
  - 외부랭킹 deposit 증가 트리거로 **구간별(10k/50k)** 해금 → `cash_balance` 합산 + 원장 기록
  - Vault 2.0 스캐폴딩용 조회(`/api/vault/programs`, `/api/vault/top`)는 read-only로 포함

---

## 0) 완료 기준(Definition of Done)

- [x] 신규회원 eligible 유저가 `/new-member/dice`에서 1회 플레이 가능
- [x] 잭팟 실패(LOSE) 시, UI는 ‘꽝/패배’ 없이 보호 시스템 → 금고 이체 연출이 노출됨(실제 시드 보관: `vault_locked_balance` 최소 10,000, 만료 24시간 설정)
- [x] `GET /api/vault/status`가 locked/available/legacy balance/cash/만료 시각/해금 규칙 JSON을 반환함(조회만으로 시드 생성 없음)
- [x] `POST /api/vault/fill`이 무료 1회(+5,000)를 처리하고, 필요 시 시드 10,000을 먼저 채운 뒤 누적(최초 호출 시 `vault_balance_after=15,000`)
- [x] 외부랭킹 업서트에서 deposit 증가가 감지되면(신규유저 + locked>0), 해금 구간에 따라 현금으로 이동하고 원장 기록이 남음
- [x] Alembic 마이그레이션 + 최소 단위 테스트(또는 통합 테스트)가 추가되어 회귀를 방지함

---

## 0.1 v1.1 최소 DB/테이블 결정(확정)

v1.1은 “Phase 1에서 locked를 소스로, balance는 미러” 원칙을 기록합니다.

- 확정(필수)
  - [x] `user.vault_locked_balance` (소스 오브 트루스)
  - [x] `user.vault_locked_expires_at` (24시간 만료 타이머)
  - [x] `user.vault_available_balance` (향후 분리용, v1.1에서는 0 유지)
  - [x] `user.vault_balance` (legacy 미러, 서비스에서 sync)
  - [x] `user.cash_balance` (해금 후 현금)
  - [x] `user_cash_ledger` (현금 원장; reason/label/meta 저장)

- 확정(무료 fill 1회 제한 저장 방식 = 가장 단순)
  - [x] `user.vault_fill_used_at DATETIME NULL` 컬럼 추가
    - 의미: 값이 있으면 무료 fill 1회 소진
    - 장점: 신규 테이블 없이도 1회 제한/감사 가능(시간까지 남음)

- 보류
  - [ ] `vault_fill_log` 테이블
  - [ ] 만료 배치(outbox/스케줄러) — Phase 1은 요청 시 만료 처리

---

## 1) DB/마이그레이션

### 1.1 User 컬럼 추가
- [x] `user.vault_balance INT NOT NULL DEFAULT 0` 추가
- [x] `user.cash_balance INT NOT NULL DEFAULT 0` 추가
- [x] `user.vault_fill_used_at DATETIME NULL` 추가 (무료 fill 1회 제한)
- [x] [app/models/user.py](../../app/models/user.py) 모델 필드 반영
- [x] Alembic revision 생성 및 적용

### 1.2 현금 원장 테이블 추가(정석)
- [x] `user_cash_ledger` 테이블 생성
  - [x] `user_id`, `delta`, `balance_after`, `reason`, `meta_json`, `created_at`
  - [x] `user_id + created_at` 인덱스
- [x] 모델 파일 추가(예: `app/models/user_cash_ledger.py`)
- [x] DB FK/삭제 정책(soft delete 없음이면 일반 FK)

메모(중요)
- Docker Compose에서 `backend`는 소스코드를 볼륨 마운트하지 않습니다. 따라서 백엔드/마이그레이션 변경 후에는 `docker compose build backend` + 재시작이 필요합니다.

---

## 2) 백엔드: 금고 API

> 신규 API는 최소 2개만(v1.0): status / fill

### 2.1 Vault 상태 조회
- [x] `GET /api/vault/status`
  - [x] 반환: `eligible`, `vault_balance`(legacy), `locked_balance`, `available_balance`, `cash_balance`, `vault_fill_used_at`, `seeded(false 고정)`, `expires_at`, `unlock_rules_json`, `program_key`
  - [x] 정책: status 조회는 seed를 생성하지 않음(주사위 LOSE/무료 fill 등 이벤트에서 seed 발생)
  - [x] 만료 처리: `vault_locked_expires_at`가 지났으면 즉시 locked=0으로 만료 후 반환
- [x] 라우터/스키마 추가
  - [x] 라우터 위치: `app/api/routes/vault.py`(신규) + `app/api/routes/__init__.py` 등록
  - [x] 스키마 위치: `app/schemas/vault.py`(신규)

### 2.2 무료 금고 채우기
- [x] `POST /api/vault/fill`
  - [x] 정책: eligible 신규 유저에게 1회만 +5,000, 최초 호출 시 시드 10,000을 먼저 채워 총 15,000
  - [x] 중복 방지: `user.vault_fill_used_at`으로 1회 제한(중복 시 400 `VAULT_FILL_ALREADY_USED`)
  - [x] 반환: `eligible`, `delta=5000`(시드 제외), `vault_balance_after`(locked 미러), `vault_fill_used_at`
- [x] 만료 처리: fill 호출 시 만료된 locked를 0으로 정리 후 진행

### 2.3 Vault 2.0 조회 스캐폴딩(읽기 전용)
- [x] `GET /api/vault/programs` — 등록된 프로그램 키/이름/지속시간/룰/카피 조회
- [x] `GET /api/vault/top` — 상위 상태(locked/available/expires/progress) 조회

---

## 3) 백엔드: 신규회원 주사위 훅(적립)

### 3.1 `NewMemberDiceService.play()` 문구/정책
- [x] 파일: [app/services/new_member_dice_service.py](../../app/services/new_member_dice_service.py)
- [x] LOSE 케이스 메시지를 ‘꽝/패배’ 없이 전환 카피로 변경
- [x] LOSE 케이스에서 금고 시드 보장
  - [x] `user.vault_locked_balance` = max(existing, 10,000), 만료 24시간 재설정, legacy mirror 동기화
- [ ] 응답에 `vault_balance_after`/`vault_seeded` 같은 필드가 필요하면 스키마/FE도 함께 변경
  - 현재 FE는 프론트에서 연출을 만들었으므로, v1.1에서도 **응답 확장 없이** 진행 가능

---

## 4) 백엔드: 외부랭킹 deposit 트리거 훅(해금)

### 4.1 훅 지점
- [x] 파일: [app/services/admin_external_ranking_service.py](../../app/services/admin_external_ranking_service.py)
- [x] `deposit_amount` 증가 감지 로직(이미 존재)을 이용

### 4.2 해금 트랜잭션(핵심)
- [x] 조건: 신규 eligible 유저 AND `vault_locked_balance > 0` AND `deposit_amount` 증가
- [x] 처리(원자적으로)
  - [x] 구간별 해금: delta ≥ 10,000 → 5,000 해금, delta ≥ 50,000 → 10,000 해금 (잔액보다 많으면 잔액 한도)
  - [x] `vault_locked_balance`에서 차감 후 legacy mirror sync + 만료 재설정
  - [x] `RewardService.grant_point(... reason="VAULT_UNLOCK", label="VAULT_UNLOCK")`로 `cash_balance` 증가
  - [x] `user_cash_ledger`에 원장 기록(이유/라벨/meta: tier, unlock_target, deposit_prev/new/delta)

### 4.3 중복 지급 방지
- [x] 만료/락 확인 후 locked가 0이면 해금 스킵
- [x] deposit_delta 구간만 재계산(동일 금액 재업서트는 delta=0으로 무시)
- [x] 트랜잭션 락 + ledger 기록으로 2중 지급 최소화

---

## 5) 백엔드 구현 순서(이대로 하면 끝)

### Phase A — 마이그레이션부터(컴파일/런타임 에러 예방)
- [x] 1) Alembic: `user`에 `vault_locked_balance/vault_locked_expires_at/vault_available_balance/vault_balance/cash_balance/vault_fill_used_at` 추가
- [x] 2) Alembic: `user_cash_ledger` 테이블 추가
- [x] 3) 모델 반영: [app/models/user.py](../../app/models/user.py) + `user_cash_ledger` 모델 파일

### Phase B — RewardService를 먼저 ‘정상 동작’시키기
- [x] 4) [app/services/reward_service.py](../../app/services/reward_service.py) `grant_point()` 구현
  - [x] `cash_balance` 증가
  - [x] 원장 기록 생성(사유/메타 포함)
  - [x] 트랜잭션/락 정책 결정(동일 유저 동시 요청 대비)
  - [x] 테스트 추가: `tests/test_reward_service_points.py`

### Phase C — Vault API 최소 2개 구현
- [x] 5) `GET /api/vault/status`
  - [x] eligible 판정 연결(신규회원 eligibility 활용)
  - [x] locked/available/cash/만료/해금 룰 반환, 시드 생성 없음
- [x] 6) `POST /api/vault/fill`
  - [x] `vault_fill_used_at` 1회 제한
  - [x] 최초 호출 시 시드 10,000 + fill 5,000, 이후 호출은 400
  - [x] Vault 2.0 accrual 기록은 실패해도 v1 흐름에 영향 없음(try/except)

### Phase D — 기존 훅 두 군데에 연결
- [x] 7) 신규회원 주사위 훅: [app/services/new_member_dice_service.py](../../app/services/new_member_dice_service.py)
  - [x] LOSE 메시지 변경(‘꽝/패배’ 제거)
  - [x] LOSE 시 vault locked 시드 보장
- [x] 8) 외부랭킹 deposit 훅: [app/services/admin_external_ranking_service.py](../../app/services/admin_external_ranking_service.py)
  - [x] deposit 증가 감지 시(eligible+locked>0) 해금 트랜잭션 실행(구간 A/B)
  - [x] `RewardService.grant_point(... reason="VAULT_UNLOCK", label="VAULT_UNLOCK")` 호출

### Phase E — 최소 테스트(회귀 방지)
- [x] 9) 테스트 추가(권장)
  - [x] Vault status 시드 부여
  - [x] Vault fill 1회 제한
  - [x] 외부랭킹 deposit 증가 → 해금 1회만

- [x] 10) 운영 E2E 점검(권장)
  - [x] 런북: [docs/06_ops/new_member_vault_unlock_e2e_runbook.md](new_member_vault_unlock_e2e_runbook.md)
  - [x] 스크립트: [scripts/e2e_vault_unlock_from_external_ranking.ps1](../../scripts/e2e_vault_unlock_from_external_ranking.ps1)


---

## 5) RewardService(정석 적립) 구현

- [x] 파일: [app/services/reward_service.py](../../app/services/reward_service.py)
- [x] `grant_point()`를 더 이상 no-op가 아니게 구현
  - [x] `cash_balance` 업데이트
  - [x] `user_cash_ledger` 기록
  - [x] `amount <= 0` 방어
  - [x] reason/meta 저장

---

## 6) 프론트엔드 구현(디자인 연속성)

### 6.1 신규회원 주사위 페이지
- [x] 파일: [src/pages/NewMemberDicePage.tsx](../../src/pages/NewMemberDicePage.tsx)
- [x] LOSE를 ‘전환’으로 연출(오버레이/로딩바 → 금고로 슝 → 금고 숫자 드르륵)
- [x] ‘꽝/패배’ 문구 제거 + 홈 이동 CTA
- [ ] (후속) 실제 vault 상태와 동기화
  - [x] `GET /api/vault/status`가 생기면, `vaultDisplayedAmount` 초기값을 서버 값으로 세팅

### 6.2 홈 상단 금고 바 + 팝업
- [x] 홈 Sticky Bar(최소 CTA 배너) 구현
  - [x] 파일: [src/pages/HomePage.tsx](../../src/pages/HomePage.tsx)
  - [x] 노출 조건: `eligible && vault_balance > 0`
  - [x] 배너 이미지 200x80 출력
- [x] (후속) 팝업/상세 설명 패널(인라인 펼침)

---

## 7) QA 시나리오(필수)

- [ ] 신규 eligible 유저
  - [ ] `/new-member/dice` 진입 가능
  - [ ] 1회 플레이 후 재플레이 차단
  - [ ] LOSE 시 보호 시스템 오버레이가 1초 내로 노출 후 사라짐
  - [ ] LOSE 시 ‘금고 보관 완료’ 토스트가 노출됨
  - 검증 방법(수동)
    - 사전 조건: 신규 eligible 유저(새 계정이거나, DB에서 eligibility upsert)
    - 확인: `/new-member/dice` 진입 → 1회 플레이 → 즉시 재시도 버튼/플로우가 차단되는지 확인
    - LOSE 연출(보호 시스템 오버레이) 노출/자동 종료(≈1초 내) 확인
    - LOSE 직후 토스트(‘금고 보관 완료’) 노출 확인

- [x] 금고 API
  - [x] `GET /api/vault/status`는 seed를 생성하지 않음(locked 만료되면 반환 전 0으로 정리)
  - [x] `POST /api/vault/fill` 1회 성공 후 2회 호출은 400 `VAULT_FILL_ALREADY_USED`
  - 자동 검증
    - pytest: `tests/test_vault_api.py`

- [x] 외부랭킹 업서트
  - [x] deposit_amount 증가 시 구간별 해금 발생(A: +5,000, B: +10,000)
  - [x] 해금 후 locked 감소, cash 증가, 원장 기록 1건 생성(meta에 tier/target/delta)
  - [x] 동일 업서트 재실행 시 delta=0 → 해금 없음
  - 자동/반자동 검증
    - pytest: `tests/test_external_ranking_vault_unlock.py`
    - 도커 E2E: `scripts/e2e_vault_unlock_from_external_ranking.ps1`

---

## 8) 릴리즈/운영 체크

- [x] 마이그레이션 적용(도커 환경 포함)
  - [x] VS Code task: `apply alembic migrations` 실행
  - [x] `alembic current`로 head 확인 (현재: `20251217_0023 (head)`)
- [ ] 운영 로그/대시보드(선택)
  - [ ] 해금 이벤트(사용자/금액/시각) 로그 남기기

