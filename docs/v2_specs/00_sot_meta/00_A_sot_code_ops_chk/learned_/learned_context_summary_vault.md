# 금고(Vault) 영역 1차 학습 컨텍스트 요약 (V2)

- 생성일: 2026-01-26
- 범위: 사용자가 지정한 학습 목록 중 **금고(Vault)와 직접 관련된 문서만** 1차 학습(요약)
- 목적: SoT(문서 정책) ↔ 구현/운영 검증을 위한 **금고 핵심 규칙/필드/제약/운영 체크포인트**를 한눈에 정리

---

## 0. 포함 문서(학습 대상) 및 선정 기준

### 선정 기준
- (Core) 문서의 주제가 금고 정책/용어/SoT 필드/입금 반영/운영 매핑인 경우 포함
- (Related) 금고를 “지불/보상/교환/라우팅”의 일부로만 언급하는 문서는 1차 학습에서는 **관련 링크만 기록**

### Core 포함 문서
- docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/vault.md
- docs/v2_specs/01_core/v2_vault_glossary_sot_ko.md
- docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md
- docs/v2_specs/01_core/v2_cc_deposit_sot_ko.md
- docs/v2_specs/01_core/v2_user_sot_ko.md

### Related(참조만)
- docs/v2_specs/01_core/flow_feature_mapping_v1_v2.md (Vault 상태/테스트/엔드포인트 언급)
- docs/v2_specs/01_core/v2_reward_mapping_sot_ko.md (POINT/CC_POINT의 기본 경로)
- docs/v2_specs/01_core/v2_shop_exchange_policy_sot_ko.md (cost_type=VAULT, 잔액 검증/차감)
- docs/v2_specs/01_core/v2_shop_inventory_service_design_ko.md (상점 구매 시 vault_locked_balance 사용)
- docs/v2_specs/01_core/v2_ticket_* (VAULT 토큰/교환 언급)
- docs/v2_specs/01_core/v2_front_admin_page_index.md (FE Vault 페이지/어드민 Vault 컨트롤 페이지)

---

## 1. Vault SoT 핵심 규칙(중복 제거 요약)

1) **잔액 SoT(단일 진실)**: `User.vault_locked_balance`만 “금고 보유액”으로 인정
- UI/서비스/운영 모두 이 필드만 참조
- `vault_available_balance`는 사용하지 않거나 0 고정
- `vault_locked_balance + vault_available_balance` 같은 합산 로직은 금지

2) **V2 신규 write 금지(레거시 필드)**
- `vault_balance`, `vault_available_balance`, `cash_balance`는 V2 신규 write 금지 (마이그레이션/동기화 목적 제외)

3) **출금(Withdraw) 자격(Strict Vault Policy)**
- `vault_withdrawal_request` 기반
- 조건 축:
  - 당일 실질 입금: `cc_deposit/cc_data` (전일 대비 **순증 Net Increase**)
  - 당일 금고 사용: `user.vault_spent_today` >= 10,000
  - 활동성 보조: 내부 원장(`last_charge_at` 등) 보조 가능하나 원칙은 `cc_deposit` 우선
- 회차별 최소 금액: 1회 10,000 / 2회 10,000 / 3회 30,000 / 4회 50,000

4) **혜택 중단(benefits_suspended) 및 한도**
- 상태 분류(입금일 기준): ACTIVE / WARNING(4~6일) / INACTIVE(7일 이상)
- INACTIVE는 `benefits_suspended=True`, 상점/게임 차단 및 금고 한도 축소
- 한도: INACTIVE/무입금 유저 30,000 KRW (초과 적립 차단 또는 소멸로 표기)

5) **KST 기준(일자/리셋/로그)**
- 당일 입금 인정, 일일 지표(`Daily Net` 등)는 KST(UTC+9) 기준
- 로그/created_at도 KST 기준 변환 저장을 권장

6) **입금 동기화 → 금고 반영(Delta 기반, 원자 트랜잭션)**
- 외부 total_deposit 스냅샷과 payload를 비교해 `delta = new - old`
- `new < old`는 데이터 오염으로 간주하여 무시(Ignore)
- `delta > 0`이면 트랜잭션으로:
  - `User.vault_locked_balance += delta`
  - 스냅샷 업데이트
  - `VaultEarnEvent` 생성(Type: `CC_DEPOSIT`) 후 `vault_event_id` 확보
  - `V2CCDepositLog` 기록( `vault_event_id` 포함 )
  - 트리거(레벨 XP 등) 실행

---

## 2. 문서별 1차 요약(정책/필드/제약/운영 포인트)

| 문서 | 목적 | 핵심 정책/필드 | FK/UNIQUE/ENUM 제약 표기 | 운영/테스트/엔드포인트 힌트 | 작성일/버전 | 변경이력/비고 |
|---|---|---|---|---|---|---|
| vault.md | Vault 영역 SoT-코드-운영-DB-프론트 매핑표 제공(관리자 친화형) | SoT: `user.vault_locked_balance` 중심, `/api/v2/vault/*` 및 `test_vault_*.py` 언급 | 일부 표기(FK/UNIQUE/ENUM 자동 점검 TODO) | 엔드포인트/pytest 파일명 힌트가 있음 | 최종 검토일 2026-01-26 | 실제 코드 경로 예시가 포함되어 있어 2차로 “실존/정합성” 검증 필요 |
| v2_vault_glossary_sot_ko.md | 금고 관련 용어 단일 기준 확정 | `vault_withdrawal_request`, `user.vault_spent_today`, `cc_deposit/cc_data`, `benefits_suspended` | 제약조건을 직접 나열하진 않음(테이블/필드 중심) | 출금 조건 표기 형식과 리셋 요구가 명확 | 2026-01-18 / v1.0 | 운영/검증 체크리스트(용어 일치) 존재 |
| v2_strict_vault_policy_sot_ko.md | 혜택 중단/출금 자격/한도 등 “강력한 금고 정책” SoT | SoT 잔액: `vault_locked_balance`만, 합산 금지, INACTIVE cap 30,000, 차단(Shop/Game) | 제약조건은 직접 나열하진 않음(정책 로직 중심) | 차단 시 403(BENEFITS_SUSPENDED) 정책 명시 | 2026-01-19 / v2.0 | v1.0은 V1 구현 문서 기반이라고 명시 |
| v2_cc_deposit_sot_ko.md | CC 입금/플레이 데이터 동기화 및 금고 반영 표준 | `v2_external_cc_data`, `v2_cc_deposit_log`, `vault_event_id`(FK), `User.vault_locked_balance += delta` | FK 표기: `user_id`(FK), `vault_event_id`(FK), PK 표기 | KST 기준/감소 무시/트랜잭션 반영/검증 시나리오 포함 | 2026-01-19 / v1.1 | “V2 Core Economy의 유일한 입금 경로”로 명시 |
| v2_user_sot_ko.md | V2 User 핵심 필드 및 금고 SoT 정의 | SoT: `vault_locked_balance`; legacy write 금지 필드 명시 | UNIQUE: `CC_id`, `telegram_id` 등 표기 | QA 체크리스트: vault_locked_balance만 쓰는지, legacy write 없는지 | 2026-01-19 / v1.0 | 최소 필드 정의(제약 포함)가 명확 |

---

## 3. 1차 “불일치 후보/2차 확인 필요” 목록

- vault.md에 기재된 “실제 코드/핵심 파일” 경로(예: `app/v2/services/vault_service.py`)는 문서 기반 표기이므로, **2차에서 실제 레포 구조와 1:1 존재 여부 확인 필요**
- 제약(FK/UNIQUE/ENUM) 표기는 문서별로 편차가 있음:
  - v2_user_sot_ko.md / v2_cc_deposit_sot_ko.md는 제약이 비교적 명확
  - v2_vault_glossary_sot_ko.md / v2_strict_vault_policy_sot_ko.md는 정책 중심이라 DB 제약 표기가 간접적

---

## 4. (자동화 전) 운영/QA 체크리스트 초안

- [ ] FE/BE/DB에서 “금고 잔액 표기/참조”가 `vault_locked_balance` 단일 기준인지
- [ ] 금고 잔액 계산에 `vault_available_balance` 합산이 존재하지 않는지
- [ ] V2 신규 로직에서 `cash_balance`/`vault_balance`/`vault_available_balance` write가 없는지
- [ ] CC 입금 동기화 시 `delta` 계산이 감소 케이스를 무시하는지
- [ ] CC 반영 트랜잭션이 `vault_locked_balance` 업데이트 + `V2CCDepositLog` + `vault_event_id` 연결을 원자적으로 보장하는지
- [ ] 출금 조건: 당일 `cc_deposit` 순증 + `vault_spent_today`(>=10,000) + 회차별 최소 금액이 일관되게 적용되는지
- [ ] INACTIVE(7일+)에서 상점/게임 차단 및 금고 한도 30,000이 적용되는지
- [ ] 모든 “당일/일일 지표/리셋”이 KST 기준인지

---

## 5. 다음 단계(대기 전 메모)

- 2차 작업에서 “SoT-코드-운영 자동 비교”를 하려면, 최소 입력이 필요:
  - grep 대상 키워드: `vault_locked_balance`, `vault_available_balance`, `cash_balance`, `benefits_suspended`, `vault_spent_today`, `vault_withdrawal_request`, `v2_cc_deposit_log`, `v2_external_cc_data`
  - pytest 대상: Vault 관련 테스트 파일 목록(문서에 언급된 `test_vault_*.py` 등)
  - DB 점검 쿼리: FK/UNIQUE/ENUM 존재 여부 및 KST 리셋 관련 컬럼 확인

(여기서 1차 학습 종료. 추가 작업 요청 전까지 대기)

---

## 6. 2차 학습(01_core + 03_api 교차 매핑)

### 6.1 2차 포함 문서(근거)
- docs/v2_specs/03_api/v2_economy_asset_log_routes_ko_v1.0.md
- docs/v2_specs/03_api/v2_api_integration_guide_ko.md
- docs/v2_specs/03_api/v2_game_api_contract_ko.md
- docs/v2_specs/03_api/v2_notification_feed_schema_ko.md
- docs/v2_specs/03_api/v2_legacy_openapi.yaml
- docs/v2_specs/03_api/v2_admin_openapi.yaml
- docs/v2_specs/03_api/v1_api_discrepancy_report.md
- docs/v2_specs/03_api/v1_legacy_api_list.json

### 6.2 API 계약 관점의 Vault 핵심 매핑

#### A) 유저(클라이언트) Vault API
- `GET /api/v2/vault/status`
  - 설명(legacy openapi): 금고 잔액/출금 조건/골든아워 상태 등을 조회
  - 응답 스키마(legacy openapi): `VaultStatusResponse`
    - 주요 필드: `vaultBalance`, `lockedBalance`, `availableBalance`, `benefits_suspended`, `vault_max_limit`, `daily_vault_spent`, `daily_deposit_confirmed` 등
- `POST /api/v2/vault/withdraw`
  - 요청 스키마(legacy openapi): `VaultWithdrawRequest { amount, protocol_key? }`
  - 응답 스키마(legacy openapi): `VaultWithdrawResponse { request_id, status, amount, balance_after }`

#### B) Admin Vault Ops(운영/원장/출금 승인)
문서(v2_economy_asset_log_routes_ko_v1.0.md) 기준 공통 프리픽스: `/api/v2/admin`
- `GET /vault/stats`
- `GET /vault/users`
- `GET /vault/users/{user_id}/ledger`
- `GET /vault/trend`
- `POST /vault/force-edit`
- `GET /vault/withdrawals/{status}`
- `POST /vault/withdrawals/{withdrawal_id}/approve`
- `POST /vault/withdrawals/{withdrawal_id}/reject`

legacy openapi에서도 유사 경로가 존재:
- `GET /api/v2/admin/vault/stats`
- `GET /api/v2/admin/vault/users`
- `GET /api/v2/admin/vault/users/{user_id}/ledger`
- `GET /api/v2/admin/vault/trend`
- `POST /api/v2/admin/vault/force-edit`
- `GET /api/v2/admin/vault/withdrawals/{status}`

통합 가이드(v2_api_integration_guide_ko.md)는 Admin UI 액션을 다음처럼 별도 프리픽스로도 표기:
- `POST /admin/api/economy/withdrawals/{id}/approve`
- `POST /admin/api/economy/withdrawals/{id}/reject`

→ **2차 불일치 후보**: Admin Ops 경로가 문서마다 `/api/v2/admin/...` vs `/admin/api/...`로 혼재. (실제 라우팅 SoT를 3차에서 확정 필요)

### 6.3 이벤트/피드(실시간 동기화)에서의 Vault 표현

알림 스키마(v2_notification_feed_schema_ko.md)에서 `USER_ASSET_UPDATE` 페이로드 예시:
- `asset_type: "VAULT"`
- `delta`, `current_balance`, `reason`

→ **정합성 요구**: `current_balance`는 반드시 SoT인 `user.vault_locked_balance` 기준으로 채워져야 함.

### 6.4 에러코드/차단 사유(정책 vs API)

- Strict Vault Policy(01_core)에서 차단 정책:
  - `benefits_suspended=True` 시 Shop/Game 접근을 `403 Forbidden` + Code `BENEFITS_SUSPENDED`로 차단하도록 명시
- Game API 계약(v2_game_api_contract_ko.md) 오류 규칙:
  - `DEPOSIT_REQUIRED`: “금고 정책 차단”
- Integration Guide(v2_api_integration_guide_ko.md) 예시 에러:
  - `VAULT_INSUFFICIENT_FUNDS`: “금고 잔액 부족”

→ **2차 불일치 후보**: 정책 문서의 `BENEFITS_SUSPENDED`와 게임 계약의 `DEPOSIT_REQUIRED`가 동일 상황인지(또는 서로 다른 차단 사유인지) 불명확. 3차에서 “에러코드 SoT 테이블”로 통합 필요.

### 6.5 OpenAPI 스키마에서 확인된 Vault 필드 표기(SoT 충돌 후보)

legacy openapi(v2_legacy_openapi.yaml):
- `UserBalanceResponse`: `vault_locked`, `vault_available`
- `VaultStatusResponse`: `vaultBalance`, `lockedBalance`, `availableBalance`, `benefits_suspended` 등

admin openapi(v2_admin_openapi.yaml):
- `AdminUserListDto.vaultBalance`
- `AdminUserDetailDto.vaultBalance`
- `AdminWalletAdjustmentRequest.token_type` 기본값: `VAULT`

→ **2차 불일치 후보**:
- SoT는 `vault_locked_balance` 단일 기준인데, API 스키마에 `vault_available`/`availableBalance`가 노출됨
- `vaultBalance`가 “무엇의 합/무엇의 별칭인지” 스키마만으로는 불명확
  - 권장: 3차에서 API 응답의 `vaultBalance == vault_locked_balance`를 SoT로 명시(또는 필드명/설명 정리)

### 6.6 V1 레거시 Vault API 잔재(폐기/차단 대상 후보)

v1_legacy_api_list.json 기준(발췌):
- `/api/vault/status`
- `/api/vault/fill`
- `/api/vault/programs`
- `/api/vault/top`
- `/api/vault/admin/requests`
- `/api/vault/withdraw`
- `/api/vault/admin/process`

→ V2 SoT 및 V2 API(`/api/v2/vault/*`)로 이관 완료 전까지는 **혼재 여부 점검(라우트/임포트/문서 표기)**이 필요.

### 6.7 2차 체크리스트(자동화 전)

- [ ] `/api/v2/vault/status` 응답의 `vaultBalance`가 실제로 `vault_locked_balance` 단일 기준인지
- [ ] `availableBalance`/`vault_available` 필드가 0 고정/미사용인지(또는 제거/Deprecated 처리인지)
- [ ] Admin Vault Ops 프리픽스가 실제 구현에서 어떤 것이 SoT인지(`/api/v2/admin` vs `/admin/api`)
- [ ] 게임 차단 에러코드(`DEPOSIT_REQUIRED` vs `BENEFITS_SUSPENDED`)의 책임 영역/표준화 여부

(여기서 2차 학습 종료. 추가 작업 요청 전까지 대기)

---

## 7. 3차 학습(04_db + 05_ops + 06_design 교차 매핑)

### 7.1 3차 포함 문서(근거)
- docs/v2_specs/04_db/v2_db_user_ko.md
- docs/v2_specs/04_db/v2_db_shop_order_ko.md
- docs/v2_specs/05_ops/v2_shop_products_ui_config_sot_ko.md
- docs/v2_specs/06_design/V2_admin_pages_list.md
- docs/v2_specs/06_design/v2_admin_master_plan_ko.md
- docs/v2_specs/06_design/v2_design_analysis_report_ko.md
- docs/v2_specs/06_design/v2_prompting_guide_ko.md

### 7.2 DB 스키마 관점: Vault SoT가 들어간 최소 테이블

#### A) `v2_user` (금고 SoT 필드 고정)
- `v2_user.vault_locked_balance` (INT, NOT NULL): **금고 SoT**
- `created_at`/`updated_at`은 KST 기준 저장을 문서에서 명시

→ 1차/2차의 “SoT 잔액 단일 기준”이 DB 스키마 문서에서도 재확인됨.

#### B) `v2_shop_order` (상점 구매 시 Vault 차감 로그)
- 범위에 “Vault 차감 및 보상 지급 로그”가 명시됨
- `cost_type` (VARCHAR, NOT NULL): 지불 재화 (기본: `VAULT`)
- `cost_amount` (INT, NOT NULL): 가격

→ 상점 구매가 금고 잔액(`vault_locked_balance`)을 비용 SoT로 삼고, 그 결과를 주문 로그로 남기는 흐름이 문서로 고정됨.

### 7.3 Ops 설정(Shop UI Config)에서의 Vault 비용 SoT

`v2_shop_products_ui_config_sot_ko.md` 기준:
- 키(`v2_shop_products`)가 없거나 비어있으면 **상점 목록이 빈 배열**로 내려감(운영 사고 포인트)
- 상점 비용 SoT: `user.vault_locked_balance` (레거시 `cash_balance` 사용 금지)
- `cost_type` 기본값: `VAULT` (옵션: `DIAMOND`)
- `cost_amount`/`reward_amount`는 정수이며 0 또는 음수 금지

→ “상점에서 Vault를 비용으로 쓴다”가 FE/BE 구현 이전에 운영 설정 레이어(UI Config)에서도 SoT로 고정되어 있음.

### 7.4 Design/Admin 관점: Vault 관제/조작 UX 요구사항

#### A) Admin 정보 구조/플로우(페이지 리스트)
`V2_admin_pages_list.md` 기준:
- Vault 관제 페이지 라우트: `/v2/admin/economy/vault` (상태: Real)
- 기능: 금고 잔액 현황, 출금 신청 승인/거절, **Audit Log 연동 강제 조정**
- 유저 상세 Drawer: 티켓/인벤토리/금고 3개 탭만 노출(잔액 확인 + 지급/회수/차감)

#### B) Admin Master Plan(안전/감사/모바일)
`v2_admin_master_plan_ko.md` 기준:
- 안전장치: **Slide-to-Approve**(출금 승인/강제 조정), **Audit Trail**(관리자 액션 로그 자동 적재)
- Economy Ops: `VaultControlPage`에서 출금 승인/반려, 강제 조정, 리스크 식별을 탭으로 운영

→ 2차에서 발견된 “Admin Vault Ops 경로 혼재”와 별개로, **UX 레벨에서 반드시 감사 로그가 남는 조작(승인/반려/강제조정)**이 요구사항으로 고정되어 있음.

### 7.5 Design/User Vault 화면 요구(유저앱)

`v2_design_analysis_report_ko.md` + `v2_prompting_guide_ko.md` 기준:
- 상단 Status Bar에 자산(Vault/Ticket) 고정 표시(어디서든 자산 확인)
- Vault Screen: 중앙 3D Vault 오브젝트, 진행률(Neon Gradient), **"출금하기" CTA 최우선**
- 출금 가능 상태 시 버튼에 시각적 피드백(Pulsating Glow) 예상
- No-scroll 정책: 메인/허브/금고 페이지는 세로 스크롤이 생기지 않게 뷰포트 내 고정 관리
- 라벨은 한글만 사용(예: 금고, 티켓)

### 7.6 3차에서 확정/추가된 정합성 체크(후속 자동화 후보)

- [ ] `v2_shop_products`에서 `cost_type=VAULT`가 기본으로 설정되어 있고, 실제 차감 기준이 `vault_locked_balance`인지
- [ ] `v2_shop_order.cost_type`이 운영 설정과 일치하고, 주문 생성 시 Vault 차감/보상 지급이 함께 로그로 남는지
- [ ] Admin 라우트(`/v2/admin/economy/vault`)와 백엔드 API(`/api/v2/admin/vault/*`, 출금 승인/반려 API)의 매핑이 문서/코드에서 일치하는지
- [ ] 승인/반려/강제 조정이 **Audit Log**로 추적 가능하게 남는지
- [ ] 유저 Vault 화면의 "출금하기" 및 조건 안내가 Strict Vault Policy(1차)와 UX 상 모순되지 않는지
- [ ] No-scroll/offset(세이프에어리어) 규정이 실제 V2 프론트 구현과 일치하는지

(여기서 3차 학습 종료. 추가 작업 요청 전까지 대기)
