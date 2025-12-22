# Vault(금고) 총관리 문서 — Reset/Phase 1 구현 기준

- 문서 타입: 총관리(현황/맵핑/분류/리셋 플랜)
- 버전: v1.0
- 작성일: 2025-12-21
- 목적: **현재 레포에 흩어진 금고 관련 요소를 한 문서에서 통제**하고, 
- "Phase 1"(locked → available → expired, 24h 만료, ticket=0 시 Vault Modal 유도 + CTA payload) 
- 기준으로 **최소 변경 리빌드**하기 위한 기준선을 만든다.

---

## 0) TL;DR

- 현재 프로덕션 코드의 금고는 **`user.vault_balance`(단일 총액)** 중심(v0.x/v1.0)이다.
- `GET /api/vault/status`와 프론트 `getVaultStatus()`를 통해 **홈/신규회원주사위/티켓0 패널**에서 "잠긴 금고"를 노출한다.
- 해금 트리거는 `admin_external_ranking_service`의 **deposit 증가 훅**이며, 현재는 **10,000 → 5,000**, **50,000 → 10,000** 같은 티어 기반으로 일부 해금한다.
- **Phase 1 목표(locked/available/expired + 24h)** 는 현재 코드에 직접 구현되어 있지 않다(문서는 있으나 DB/서비스는 단일 vault_balance 기반).
- 본 문서는 (1) 전수 목록, (2) 아카이브/수정사용 분류, (3) 실제 동작 코드 맵핑, (4) Phase 1 최소변경 구현 순서를 제공한다.

2025-12-21 추가(이번 작업)
- ticket=0에서 열 수 있는 **Vault Modal(안내 모달)** 을 추가했고, 모달 카피는 **DB(app_ui_config)** 기반으로 운영이 daily 변경 가능하도록 엔드포인트를 분리했다.
- Vault 2.0 상태머신을 위한 DB/서비스/라우트는 **스캐폴딩만** 추가했다(현재 경제/동작 변화 없음).

2025-12-22 추가(이번 작업)
- Phase 1 기준으로 **`vault_locked_balance`를 단일 기준(source of truth)** 으로 전환했고, `vault_balance`는 **read-only mirror**로만 유지한다.
- 외부랭킹(deposit delta) 해금 계산/처리를 `admin_external_ranking_service`에서 제거하고, `vault_service`로 **책임을 일원화**했다.
- Vault2는 (행동 변화 없이) 정책 JSON/상태전환 helper + 이벤트 기록을 확장했고, 전이를 실제로 돌릴 수 있도록 **admin 전용 tick 엔드포인트**를 추가했다.

---

## 1) 용어(Phase 1 기준)

- **Locked**: 금고에 적립되었으나 즉시 사용 불가
- **Available**: 잠김이 풀려 즉시 사용 가능(또는 보유 머니로 이동 가능한 잔액)
- **Expired**: 24시간 만료로 소멸(잠긴 잔액만 만료 대상)
- **expires_at**: 현재 잠긴 잔액이 만료되는 시각(Phase 1에서는 “다음 만료 시각 1개”를 우선 지원)
- **recommended_action**: ticket=0 등 상황에서 프론트가 수행해야 하는 권장 행동(예: `OPEN_VAULT_MODAL`)

Phase 1 단일 기준(중요)
- Phase 1에서는 `vault_balance`를 계산 기준으로 사용하지 않는다.
- `vault_locked_balance`가 **단일 기준(source of truth)** 이며,
  `vault_balance`는 레거시 UI 호환을 위한 **read-only mirror**로만 유지한다.
- Phase 1에서 `available_balance`는 만료되지 않는다.
  `available_balance`의 사용/정산/출금 정책은 기존 `cash_balance` 정책을 그대로 따른다.

시간 정책
- 백엔드는 naive `datetime.utcnow()`를 사용해도 됨. 스키마는 `KstBaseModel`이라 JSON은 KST(+09:00)로 직렬화된다.

---

## 2) 현재 구현(실제 동작 코드) — 스냅샷

### 2.1 DB(현재)

- `app/models/user.py`
  - `vault_balance INT NOT NULL DEFAULT 0` (레거시 UI 호환용 mirror)
  - `vault_locked_balance INT NOT NULL DEFAULT 0` (Phase 1 단일 기준)
  - `vault_available_balance INT NOT NULL DEFAULT 0` (Phase 2/3 확장용, 현재 v1 경제에는 미사용)
  - `vault_locked_expires_at DATETIME NULL` (Phase 2/3 확장용, 현재 v1 경로에서는 미사용)
  - `cash_balance INT NOT NULL DEFAULT 0`
  - `vault_fill_used_at DATETIME NULL`

- (스캐폴딩/행동 변화 없음) `app/models/vault2.py`
  - `vault_program`, `vault_status`
  - 2025-12-22 확장: `expire_policy`, `unlock_rules_json`, `ui_copy_json`, `is_active`, `available_amount`, `progress_json`

> 현재 v1 경제 동작은 여전히 "해금 시 cash로 지급"이며,
> Phase 1 구현에서는 계산/쓰기 기준을 `vault_locked_balance`로 전환하고 `vault_balance`는 mirror로만 유지한다.

### 2.2 백엔드 API(현재)

- `app/api/routes/vault.py`
  - `GET /api/vault/status`
    - 응답: `eligible`, `vault_balance(=mirror)`, `cash_balance`, `vault_fill_used_at`, `seeded`, `expires_at(현재 None)`
  - `POST /api/vault/fill`
    - 신규 eligible 유저에 한해 무료 1회 fill(+5,000)
  - (스캐폴딩/행동 변화 없음) `GET /api/vault/programs`
  - (스캐폴딩/행동 변화 없음) `GET /api/vault/top`

- Vault2 운영 트리거(관리자 전용)
  - Admin: `POST /admin/api/vault2/tick?limit=500`
    - 동작: `Vault2Service.apply_transitions()`를 실행해 LOCKED→AVAILABLE (옵션으로 AVAILABLE→EXPIRED) 전이를 적용
    - 반환: `{ updated: N }`

- UI Copy(운영 daily 변경)
  - Public: `GET /api/ui-copy/ticket0`
  - Admin: `PUT /api/admin/ui-copy/ticket0`
  - Storage key: `app_ui_config.key = "ticket0_resolution_copy"`

- `app/schemas/vault.py`
  - `VaultStatusResponse`: 단일 `vault_balance` 중심
  - `VaultFillResponse`: `vault_balance_after`, `vault_fill_used_at`

### 2.3 백엔드 서비스(현재)

- `app/services/vault_service.py`
  - `get_status()`
    - **status 조회로 자동 시드하지 않음** (테스트로 보장)
  - `fill_free_once()`
    - eligible이 아니면 `VAULT_NOT_ELIGIBLE`
    - `vault_fill_used_at`이 있으면 `VAULT_FILL_ALREADY_USED`
    - `(vault_locked_balance==0 && cash_balance==0)`이면 **10,000 시드 후** +5,000
  - `handle_deposit_increase_signal()`
    - 외부랭킹 deposit delta 신호를 받아 unlock 계산/적용(locked 감소 + cash 지급)을 **여기서 일원화**
    - Phase 2/3 준비로 Vault2 `record_unlock_event()`를 함께 기록(경제 변화 없음)

- `app/services/new_member_dice_service.py`
  - 잭팟 실패(outcome=LOSE) 시
    - `user.vault_locked_balance`를 기준으로 시드 보장 + `vault_balance` mirror는 `VaultService.sync_legacy_mirror()`로만 갱신

- `app/services/admin_external_ranking_service.py`
  - 외부 랭킹 upsert에서 `deposit_amount` 증가 감지
  - 신규 eligible 유저 + `user.vault_locked_balance > 0`이면
    - unlock 계산/처리 자체는 `VaultService.handle_deposit_increase_signal()`에 위임
    - `RewardService.grant_point(... reason="VAULT_UNLOCK")`로 `cash_balance`에 반영(기존 경제 유지)

- `app/services/vault2_service.py` (스캐폴딩 + helper)
  - `accrue_locked()`, `record_unlock_event()` : Phase 2/3 관측/마이그레이션 준비용 이벤트 기록
  - `apply_transitions()` : LOCKED→AVAILABLE, (옵션) AVAILABLE→EXPIRED 전이 적용 helper

### 2.4 프론트(현재)

- `src/api/vaultApi.ts`
  - `getVaultStatus()` → `GET /api/vault/status`
  - 응답 매핑: `vaultBalance`, `cashBalance`, `vaultFillUsedAt`, `expiresAt`

- `src/pages/HomePage.tsx`
  - `useQuery(['vault-status'])`로 조회
  - `eligible && vaultBalance > 0`이면 상단 Sticky 배너 노출
  - 배너 내 문구/CTA는 현재 "10,000 → 5,000 / 50,000 → 전액"처럼 **현 코드 로직과 일부 불일치**(주의 필요)

- `src/components/game/TicketZeroPanel.tsx`
  - 티켓 0 상황의 해결 패널
  - 금고 프리뷰(현재는 `vaultBalance`만 표시)
  - "금고 안내 보기" 버튼 → Vault Modal 오픈

- `src/components/vault/VaultModal.tsx`
  - open 시 `GET /api/ui-copy/ticket0` fetch 후 운영 카피 렌더

- `src/pages/NewMemberDicePage.tsx`
  - 애니메이션(금고로 이동, 카운트업)
  - 서버 `getVaultStatus()`로 금고 표시값 동기화

- `src/pages/GuidePage.tsx`
  - `MyVaultSection`은 예시/데모 성격(하드코딩 값)

### 2.5 테스트(현재)

- `tests/test_vault_api.py`
  - status fetch는 자동 시드 금지
  - fill은 1회만 성공(시드+5,000)

- `tests/test_external_ranking_vault_unlock.py`
  - deposit 증가 시 `vault_locked_balance` 일부 해금 → cash 반영 + 원장 생성
  - `vault_balance` mirror가 locked와 동기화되는지도 함께 검증

---

## 3) 금고 관련 문서/스크립트 인벤토리(전수 목록)

### 3.1 모듈 설계 문서 (docs/05_modules)

- `docs/05_modules/05_module_vault_unlock_feature_v1.0.md`
  - locked/available/expiry/부분해금/소셜프루프/지민 메시지(outbox)까지 포함된 확장 설계
  - **Phase 1 요구(locked→available→expired, 24h)** 와 직접적으로 가장 근접

- `docs/05_modules/05_module_vault_new_user_strategy_v2.0.md`
  - 골드/플래티넘/다이아 3단계 미션 기반(7일 만료)
  - Phase 1과 스코프가 다름(장기 확장 설계)

- `docs/05_modules/05_module_vault_existing_user_strategy_v2.0.md`
  - 기존 회원용 리텐션 설계(정산/트리거/소멸 등)
  - Phase 1과 스코프가 다름(장기 확장 설계)

### 3.2 운영/런북 (docs/06_ops)

- `docs/06_ops/new_member_vault_funnel_plan_v1.0.md`
  - 신규회원 퍼널 기준(시드 10,000 + 무료 fill 5,000 + 입금 트리거)

- `docs/06_ops/new_member_vault_funnel_implementation_checklist_v1.0.md`
  - 구현 체크리스트 및 파일/라우트 위치

- `docs/06_ops/new_member_vault_unlock_e2e_runbook.md`
  - 외부랭킹 deposit 훅으로 vault unlock 검증 런북 + 스크립트 연결

### 3.3 기타 관련 문서

- `docs/ui_ux_retention_analysis.md`
  - 금고 개념의 장단점(해금 조건의 명확화 필요 등)

- `docs/new_member_onboarding_funnel_design.md`, `docs/new_member_onboarding_funnel_checklist.md`
  - 티켓 0 → 금고 CTA/스크롤 등의 이벤트/체크 항목 흔적

---

## 4) 아카이브 vs 수정사용 분류(Phase 1 기준)

> 여기서 "아카이브"는 **지금 Phase 1 구현에 직접 쓰지 않음**을 의미한다(파일 이동/삭제는 별도 작업).

### 4.1 수정해서 계속 사용(KEEP + REFACTOR)

- 백엔드
  - `app/api/routes/vault.py` (라우트 프레임 유지, 응답 스키마 확장)
  - `app/services/vault_service.py` (Phase 1 상태/만료/전환 로직으로 재구축)
  - `app/services/admin_external_ranking_service.py` (deposit 훅은 유지하되 unlock 계산/전환 대상 변경)
  - `app/services/new_member_dice_service.py` (금고 적립/만료 시작 시점 부여)

- 프론트
  - `src/api/vaultApi.ts` (응답 필드 확장/호환)
  - `src/pages/HomePage.tsx` (배너는 유지하되, Phase 1에 맞춰 카피/조건/CTA payload 연동)
  - `src/components/game/TicketZeroPanel.tsx` (ticket=0 시 Vault Modal 유도 플로우에 연결)
  - `src/pages/NewMemberDicePage.tsx` (연출은 유지, 서버 상태 필드에 맞춰 동기화)

- 테스트
  - `tests/test_vault_api.py`, `tests/test_external_ranking_vault_unlock.py` (Phase 1 정책에 맞춰 업데이트)

### 4.2 Phase 1에서는 아카이브(KEEP as DOC / NOT IN SCOPE)

- `docs/05_modules/05_module_vault_new_user_strategy_v2.0.md`
- `docs/05_modules/05_module_vault_existing_user_strategy_v2.0.md`

(이 문서들은 향후 확장 설계로 유지하되, Phase 1 구현의 기준 문서는 아님)

### 4.3 검토 필요(혼동 위험)

- `src/pages/GuidePage.tsx`의 `MyVaultSection`
  - 실제 API/상태와 무관한 데모 UI로 보임
  - Phase 1 UX에서 금고 개념이 바뀌면 사용자 혼동 가능 → 추후 제거/수정 후보

---

## 5) 실제 동작 맵핑(코드 섹션 단위)

### 5.1 “금고 상태 조회”

- FE: `src/api/vaultApi.ts:getVaultStatus()`
- BE: `GET /api/vault/status` → `app/api/routes/vault.py:status()`
- Service: `app/services/vault_service.py:VaultService.get_status()`
- Model: `app/models/user.py:User(vault_balance, cash_balance, vault_fill_used_at)`

사용 UI
- 홈: `src/pages/HomePage.tsx`
- 티켓0 패널: `src/components/game/TicketZeroPanel.tsx`
- 신규회원 주사위: `src/pages/NewMemberDicePage.tsx`

### 5.2 “무료 1회 fill(+5,000)”

- BE: `POST /api/vault/fill` → `VaultService.fill_free_once()`
- 제약: `vault_fill_used_at` 1회 제한

### 5.3 “입금 증가(deposit delta)로 해금”

- Entry: `AdminExternalRankingService.upsert_many()`
- 조건: 신규 eligible + `vault_balance > 0`
- Effect: vault 감소 + cash 증가 + 원장 기록(`VAULT_UNLOCK`)

### 5.4 “신규회원 주사위로 시드(10,000)”

- `NewMemberDiceService.play()`의 LOSE 분기에서 `vault_balance` 하한을 10,000으로 올림

---

## 6) Phase 1 리셋 목표(요구사항)

요구사항 요약
- 상태: `locked → available → expired`
- 정책: 잠긴 잔액은 24시간 내 회수/해금(또는 전환)하지 않으면 만료
- ticket=0 UX: 백엔드/프론트가 합의한 `recommended_action = OPEN_VAULT_MODAL` + CTA payload로 유도
- 최소 변경: 기존 라우트/쿼리 키/주요 UI 접점을 최대한 유지하면서 데이터 모델만 Phase 1에 맞춘다.

현실 체크(2025-12-21 기준)
- `recommended_action`/`cta_payload`를 내려주는 Phase 1 확장은 아직 미구현.
- 대신 ticket=0에서 열 수 있는 Vault Modal에 **운영 카피(ticket0_resolution_copy)** 를 연결해 daily 대응을 먼저 확보.

---

## 7) Phase 1 최소변경 구현 전략(제안)

### 7.1 데이터 모델(최소 변경 옵션)

옵션 A (최소 변경, 권장)
- `user` 테이블에 컬럼 추가
  - `vault_locked_balance INT NOT NULL DEFAULT 0`
  - `vault_available_balance INT NOT NULL DEFAULT 0`
  - `vault_expires_at DATETIME NULL`
- 점진적 호환
  - 기존 `vault_balance`는 Phase 1 전환 동안 **read-only mirror(=vault_locked_balance)** 로만 유지하고, 계산/쓰기 기준은 `vault_locked_balance`로 일원화

만료 범위(중요)
- 만료(Expired) 대상은 **locked만**이다.
- `vault_available_balance`는 만료되지 않으며, 사용/정산/출금은 기존 `cash_balance` 정책을 그대로 따른다.

옵션 B (정석 확장)
- `vault_account`, `vault_earn_log` 등 별도 테이블 신설
- 장점: FIFO/부분해금/복수 적립 로그/정확한 만료 처리에 유리
- 단점: 마이그레이션/코드 변경량 증가(Phase 1 “최소 변경”과 상충)

Phase 1에서는 옵션 A로 가고, v1.1 이후 옵션 B로 확장하는 것이 리스크가 낮다.

### 7.2 API 스키마(Phase 1)

- `GET /api/vault/status` 응답을 아래로 확장(기존 필드 유지/호환)
  - `locked_balance`
  - `available_balance`
  - `expires_at`
  - `recommended_action` (nullable)
  - `cta_payload` (nullable JSON)

- 기존 `vault_balance`는 deprecated로 유지(또는 `locked_balance`를 내려주면서 프론트에서 `vaultBalance`로 매핑)

### 7.3 서비스 로직(Phase 1)

- 적립(locked 증가) 시점
  - 신규회원 주사위 결과(또는 별도 훅)에서 `locked += seed` 설정
  - 동시에 `expires_at = now + 24h` (Phase 1에서는 단일 만료로 시작)

- 해금(locked → available)
  - `admin_external_ranking_service`는 "입금 발생 여부"만을 신호로 제공한다.
  - 해금 계산 로직(얼마나/어떻게 해금할지)은 `vault_service`로 일원화한다.
  - 결과 적용은 `vault_locked_balance`를 깎고 `vault_available_balance`를 올린다.
  - Phase 1 스펙의 unlock 단위/비율(예: 1콩당 15,000)은 정책 결정 후 `vault_service`에 반영

- 만료(expire)
  - `expires_at <= now`이면 `locked = 0`, `expires_at = NULL` (Phase 1 단순 버전)
  - (추후) 복수 적립 로그가 필요해지면 earn_log로 확장

### 7.4 ticket=0 연동(Phase 1)

- 티켓0 패널은 "금고 프리뷰"만이 아니라, 
  - 서버가 준 `recommended_action=OPEN_VAULT_MODAL`이면 Vault Modal을 열도록 연결
  - Vault Modal 안에서 CTA payload를 사용해 1차 행동(충전/인증/안내)로 유도

---

## 8) 다음 액션(실행 순서)

1) Phase 1 스키마(A)로 Alembic 마이그레이션 생성
2) `vault_service.py`를 Phase 1 상태/만료 계산으로 교체
3) `admin_external_ranking_service.py`의 unlock 훅을 Phase 1 전환 대상으로 수정
4) 프론트 `vaultApi.ts`/`HomePage`/`TicketZeroPanel`을 새 응답에 맞춰 최소 수정
5) 테스트 2개 업데이트(상태/해금/만료 케이스)

---

## 9) 메모(중요한 불일치 포인트)

- 현재 홈 배너 문구(“5만원 충전 시 전액 해금”)는 실제 백엔드 로직(티어 B: 10,000 해금)과 불일치 가능성이 있다.
- Phase 1로 리셋할 때는 **문구/정책/코드가 1:1로 맞도록** 먼저 정책을 확정해야 한다.
