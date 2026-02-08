# 프로젝트 V2: 마이그레이션 및 리팩토링 로드맵

**목표**: 다음 달부터 시작되는 V2 프로젝트를 위해, 기존 소스 코드를 기반으로(Copy & Refactor) 하되, **"웹 우선 개발(Web-First)"** 전략을 통해 텔레그램 의존성 없이 로직을 완벽하게 검증한 후 통합하는 것을 목표로 합니다.

| 구분 | 내용 |
|------|------|
| **범위** | 풀스택 (프론트엔드, 백엔드, 데이터베이스, 인프라) - 모든 영역 |
| **핵심 전략** | 1. V2 브랜치 격리 / 2. Web-First & Auth Mocking / 3. SoT 기반 재검증 |

### 핵심 전략 상세

1. **V2 브랜치 격리**: `v2-develop` 브랜치에서 완전히 독립적으로 개발하여 V1 운영에 영향을 주지 않음
2. **Web-First & Auth Mocking**: 개발 단계에서는 "가상 로그인"으로 모든 기능을 테스트하고, 마지막 단계에 텔레그램 SDK를 씌움
3. **SoT 기반 재검증**: 확정된 SoT 문서를 기준으로 "재구현"에 가깝게 검증

---

## Phase 0: 준비 단계 ✅

> *목표: 흔들리지 않는 설계도와 작업 환경 구성*

### 1. V2 브랜치 및 환경 설정 ✅

- [x] `v2-init` 브랜치 생성 및 `src/v2`, `docs/v2_specs` 디렉토리 구성
- [x] 폴더 구조 확립: `docs/v2_specs/` (00_sot_meta, 01_core, 02_game, 03_api, 04_db, 05_ops 등)
- [x] V2 문서 규칙 수립 (`01_V2_DOCUMENTATION_RULES.md`)

**근거**:
- [00_INDEX.md](../00_sot_meta/00_INDEX.md)
- [01_V2_DOCUMENTATION_RULES.md](../00_sot_meta/01_V2_DOCUMENTATION_RULES.md)

### 2. SoT 문서 확정 및 한글화 ✅

> 모든 명세의 모호함을 제거하고, 기획 의도를 명확히 한글로 확정

- [x] **Core Economy**: `v2_vault_glossary`, `v2_strict_vault_policy`, `v2_reward_mapping`, `golden_v2_core_economy_glossary`
- [x] **Game Specs**: `v2_game_action_schema`, `v2_mission_glossary`, `v2_admin_game_config_schema`
- [x] **Ops Specs**: `v2_ops_plan_execution_schema`, `v2_ops_action_glossary`
- [x] **Infra Specs**: `v2_redis_keys_channels`, `02_golden_v2_realtime_architecture`

**근거**:
- [v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md)
- [v2_strict_vault_policy_sot_ko.md](../01_core/v2_strict_vault_policy_sot_ko.md)
- [v2_reward_mapping_sot_ko.md](../01_core/v2_reward_mapping_sot_ko.md)
- [golden_v2_core_economy_glossary_ko.md](../07_golden/golden_v2_core_economy_glossary_ko.md)
- [v2_game_action_schema_sot_ko.md](../02_game/v2_game_action_schema_sot_ko.md)
- [v2_mission_glossary_sot_ko.md](../02_game/v2_mission_glossary_sot_ko.md)
- [v2_admin_game_config_schema_ko.md](../02_game/v2_admin_game_config_schema_ko.md)
- [v2_ops_plan_execution_schema_sot_ko.md](../05_ops/v2_ops_plan_execution_schema_sot_ko.md)
- [v2_ops_action_glossary_sot_ko.md](../05_ops/v2_ops_action_glossary_sot_ko.md)
- [v2_redis_keys_channels_sot_ko.md](../01_core/v2_redis_keys_channels_sot_ko.md)
- [02_golden_v2_realtime_architecture.md](../07_golden/02_golden_v2_realtime_architecture.md)

### 3. API 전수 조사 및 보안 감사 ✅

- [x] V1 Swagger 추출 (`v1_legacy_api_list.json`)
- [x] 보안 취약점 감사 (Dev Endpoint 노출 확인)
- [x] 불일치 리포트 최신 API 리스트 기준 검증 반영 (Critical 보안 이슈 식별)

**근거**:
- [v1_legacy_api_list_ko.md](../03_api/v1_legacy_api_list_ko.md)
- [v1_legacy_api_list.json](../03_api/v1_legacy_api_list.json)
- [v1_api_discrepancy_report.md](../03_api/v1_api_discrepancy_report.md)
- [v1_api_discrepancy_report_ko.md](../03_api/v1_api_discrepancy_report_ko.md)

---

## Phase 1: 기반 구축 ✅

> *목표: 텔레그램 없이도 돌아가는 강력한 백엔드와 테스트 환경*

### 1. Web-First 인증 시스템 (Mock Auth) ✅

- **개념**: 텔레그램 `initData`가 없어도 개발자/테스터가 로그인할 수 있는 `DevLogin` 기능
- **구현**: `POST /api/v2/dev/login` (프로덕션 환경변수로 차단)
- **이점**: 프론트엔드 개발자가 Chrome 모바일 뷰에서 쾌적하게 개발 및 디버깅 가능
- [x] DevLogin 엔드포인트 구현

**근거**:
- [dev_login.py](../../../app/api/routes/dev_login.py)
- [routes/__init__.py](../../../app/api/routes/__init__.py#L47-L50)

### 2. Strict Type & Schema 정의 ✅

- **원칙**: `any` 타입 절대 금지. 모든 입/출력 데이터는 스키마에 의해 검증되어야 함
- [x] 스키마 SoT 문서 정리 완료
- [x] Pydantic/Zod 코드 변환 (5개 스키마 + 추가 49개)

**변환 완료 스키마**:
- Progression → Game Action → Admin Game Config → Notification Feed → Ops Execution

**근거 (Backend)**:
- [v2_progression.py](../../../app/v2/schemas/v2_progression.py)
- [v2_game_action.py](../../../app/v2/schemas/v2_game_action.py)
- [v2_admin_game_config.py](../../../app/v2/schemas/v2_admin_game_config.py)
- [v2_notification_feed.py](../../../app/v2/schemas/v2_notification_feed.py)
- [v2_ops_execution.py](../../../app/v2/schemas/v2_ops_execution.py)

**근거 (Frontend)**:
- [enums.ts](../../../src/v2/types/enums.ts)
- [progression.ts](../../../src/v2/types/progression.ts)
- [gameAction.ts](../../../src/v2/types/gameAction.ts)
- [adminGameConfig.ts](../../../src/v2/types/adminGameConfig.ts)
- [notificationFeed.ts](../../../src/v2/types/notificationFeed.ts)
- [opsExecution.ts](../../../src/v2/types/opsExecution.ts)

### 3. 데이터베이스 재설계 (V2 Schema) ✅

- [x] `dirty`한 컬럼명 정리, 인덱스 최적화
- [x] Money Integrity 체크 제약 추가: `Check Constraint (balance >= 0)`
- **마이그레이션 전략**: 다음달 완전 리셋 배포 전제 → **베이스라인 스냅샷 1개 + 이후 최소 누적**
- **현재 head**: `20260119_1712`

> ⚠️ **운영 주의**: 컨테이너 기본 DB는 V1일 수 있으므로, V2 작업은 아래 URL로 실행
> `DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/v2`

**마이그레이션 파일**:
- [baseline_v2_snapshot.py](../../../alembic/versions/20260119_0904_3bc52f37e0c0_baseline_v2_snapshot.py)
- [add_v2_level_reward_table.py](../../../alembic/versions/20260119_1000_add_v2_level_reward_table.py)
- [add_v2_ticket_conversion_policy.py](../../../alembic/versions/20260119_1100_add_v2_ticket_conversion_policy.py)
- [add_v2_shop_exchange_ticketzero_ops_tables.py](../../../alembic/versions/20260119_1200_add_v2_shop_exchange_ticketzero_ops_tables.py)
- [add_v2_user_table.py](../../../alembic/versions/20260119_1400_add_v2_user_table.py)
- [add_v2_game_tables.py](../../../alembic/versions/20260119_1500_add_v2_game_tables.py)
- [add_v2_segment_message_tables.py](../../../alembic/versions/20260119_1600_add_v2_segment_message_tables.py)
- [add_v2_golden_retention_tables.py](../../../alembic/versions/20260119_1700_add_v2_golden_retention_tables.py)
- [add_v2_puzzle_tokens.py](../../../alembic/versions/20260119_1711_add_v2_puzzle_tokens.py)
- [add_vault_spent_today_fields.py](../../../alembic/versions/20260119_1712_add_vault_spent_today_fields.py)

### [Critical] V2 독립 폴더 구조 전략

> V1 레거시와 분리된 클린 V2 코드베이스(`app/v2`, `src/v2`) 구축

**디렉토리 구조**:
| 영역 | 경로 | 구성 |
|------|------|------|
| Backend | `app/v2/` | Models, Schemas, API Routes, Services, Utils |
| Frontend | `src/v2/` | Types, API Clients, Components, Hooks |
| Database | 독립 `Base` 클래스 | V2 전용 Alembic 마이그레이션 |

**마이그레이션 액션**:
- 기존 V2 스키마/타입을 `app/v2/schemas`, `src/v2/types`로 이동
- `app/v2/models`에 새 ORM 정의 (V1 Base와 분리)
- `alembic.env`가 V2 메타데이터 참조하도록 업데이트
- **Minimal Patch 전략**: V1 리팩토링 없이 "Create New & Move"만 수행

---

## Phase 2: 코어 경제 및 금고 로직 ✅

> *목표: 돈과 관련된 로직의 무결성 확보 (TDD 필수)*
> **[구현 계획서 바로가기](./v2_phase2_core_economy_plan.md)**

### Phase 2 검증 완료 사항

| 항목 | 설명 |
|------|------|
| **금고 무결성** | V2User 모델의 `vault_locked_balance`가 유성/현금성 자산의 유일한 SoT로 작동 확인 |
| **트랜잭션 원자성** | 상점 구매 시 잔액 차감 → 주문 로그 생성 → 인벤토리 지급이 단일 트랜잭션 내 처리 검증 |
| **게임 API 흐름** | 룰렛, 주사위, 복권 V2 엔드포인트가 `/api/v2/...` 경로에서 정상 응답 확인 |

### 1. V2 독립 폴더 구조 생성 ✅

- **Backend**: `app/v2` 하위 `models`, `schemas`, `services`, `api`, `utils` 생성 완료
- **Frontend**: `src/v2` 하위 `types`, `api`, `components`, `hooks` 생성 완료

### 2. 스키마 및 타입 이관 ✅

- **Backend Schemas**: `app/v2_*.py` → `app/v2/schemas/`로 이동 및 리네임 완료
- **Frontend Types**: `src/types/v2/*` 및 루트 V2 타입 → `src/v2/types/`로 통합 완료
- **Alembic Config**: `alembic.env.py`가 V2 메타데이터 참조하도록 전환 완료

### 3. 핵심 경제 로직 구현 (TDD) ✅

- **Target**: Vault Consistency (금고 무결성)
- [x] `tests/v2/core/test_vault_consistency.py` 작성
- [x] `app/v2/models/user.py` (V2 User 모델) 정의 및 `vault_locked_balance` 엄격 적용
- [x] 테스트 통과 및 검증

```bash
# 테스트 결과
pytest -q tests/test_vault_withdrawal_policy.py tests/v2/core/test_vault_consistency.py
# 8 passed, 4 warnings in 0.33s
```

### 4. User Ledger & Vault (TDD) ✅

- **원칙**: 테스트 코드 작성 후 개발
- **검증 항목**:
  - 입금 (외부 랭킹 동기화)
  - 출금 (Strict Policy 일치 여부)
  - 동시성 (따닥 방지)

### 5. 상점(Shop) 및 인벤토리 ✅

- [x] 트랜잭션 원자성 보장: 구매 → 인벤토리 지급 → 차감이 한 호흡으로 동작
- [x] 입금 루틴: 외부 랭킹 서버 데이터 수신 후 DB 반영 로직 검증
- [x] 출금 루틴: Strict Policy(당일 입금 확인, 활동성 체크) 로직 검증
- [x] 동시성 테스트: 0.1초 간격 10번 구매 요청 시 1번만 결제 확인

> ⚠️ **주의**: `v2_shop_products` UI Config 미설정 시 상점 목록이 빈 배열로 반환됨

**근거**:
- [sot_verification_report_shop.md](../99_verification/sot_verification_report_shop.md)
- [v1_to_v2_shop_products_conversion_ko.md](../01_core/v1_to_v2_shop_products_conversion_ko.md)

### 추가 완료 작업

#### 상점/인벤토리 서비스 레이어 설계 ✅
- ShopService 구매 플로우 확정 (차감 → 로그 → 지급)
- InventoryService 교환/지급 흐름 확정
- 실패/롤백 케이스 목록화
- **근거**: [v2_shop_inventory_service_design_ko.md](../01_core/v2_shop_inventory_service_design_ko.md)

#### Ticket Zero 로직 API 계약서 ✅
- `GET /status` 응답 계약 (`bailout_available` 플래그)
- `POST /api/retention/bailout` 요청/응답 스키마 정의
- 쿨다운/잔액/미수령 조건 테스트 초안
- **근거**: [v2_ticket_zero_api_contract_ko.md](../03_api/v2_ticket_zero_api_contract_ko.md), [ticket_zero_service.py](../../../app/v2/services/ticket_zero_service.py)

#### Ops 실행 결과 저장/조회 API ✅
- 결과 저장/조회 API 스펙 정의
- 어드민 화면 연동 범위 결정
- **근거**: [v2_ops_execution_api_contract_ko.md](../05_ops/v2_ops_execution_api_contract_ko.md), [admin_ops_plan.py](../../../app/v2/api/admin_ops_plan.py)

#### V2 전용 마이그레이션 스냅샷 기준 ✅
- 배포 전 clean snapshot 생성 기준 정리
- 스냅샷 생성/적용 절차 문서화
- **근거**: [v2_db_snapshot_regeneration_policy_ko.md](../04_db/v2_db_snapshot_regeneration_policy_ko.md)

---

## Phase 3: 게임 및 컨텐츠 ✅

> *목표: 웹 환경에서 게임 로직 완벽 검증*

### 1. 게임 엔진 표준화 (Game Engine V2) ✅

- 룰렛, 주사위, 복권 로직 추상화 및 Config Schema 강제 적용
- 공통 로직 추상화: 입장 → 결과 산출 → 보상 지급
- **검증**: V2 core 테스트 16건 통과, API 스모크 테스트 통과

**근거**:
- [v2_game_engine_standardization_design_ko.md](../02_game/v2_game_engine_standardization_design_ko.md)
- [v2_game_engine_sot_ko.md](../02_game/v2_game_engine_sot_ko.md)

### 2. 프론트엔드-백엔드 연동 🟡

- 표준 Web API로 게임 플레이 연동 및 Network 탭 검증
- **상태**: Admin 외 일반 FE는 미구현 상태

**근거**:
- [gameApi.ts](../../../src/v2/api/gameApi.ts)
- [useV2Game.ts](../../../src/v2/hooks/useV2Game.ts)

---

## Phase 4: 어드민 및 운영 도구 ✅

> *목표: 운영자가 신뢰할 수 있는 제어판*

### 1. Admin V2 재구축 ✅

- [x] RBAC(권한 관리) 적용
- [x] Foundation, Dashboard, CRM, GameOps, InventoryOps 구현
- [x] 기존 운영툴(응대 플레이북, 위기 레이더) DB 연결

**근거**:
- [v2_admin_master_plan_ko.md](../06_design/v2_admin_master_plan_ko.md)
- [src/v2/admin/pages](../../../src/v2/admin/pages)
- [verify_admin_ops_v2.py](../../../scripts/verify_admin_ops_v2.py)

### 2. API 클라이언트 표준화 ✅

모든 V2 API 클라이언트가 통합 `v2Client`를 사용하도록 업데이트 완료:

| 파일 | 업데이트 내용 |
|------|--------------|
| `shopApi.ts` | `sku` 사용, 응답 스키마 매칭 |
| `inventoryApi.ts` | wallet balance 매핑 업데이트 |
| `ticketZeroApi.ts` | eligibility/bailout 응답 타입 업데이트 |
| `missionApi.ts` | 백엔드 라우트 동기화 |
| `gameApi.ts` | 토큰 매핑/플레이 엔드포인트 표준화 |
| 기타 | `goldenApi`, `teamBattleApi`, `inboxApi` → `v2Client` 이관 |

### 3. 리액티브 훅 검증 ✅

모든 V2 훅이 업데이트된 API 클라이언트 및 쿼리 무효화와 올바르게 통합됨 확인:
- `useV2Game`, `useV2Shop`, `useV2Inventory`, `useV2TicketZero`
- `useV2Mission`, `useV2Inbox`, `useV2Golden`, `useV2TeamBattle`

**검증 결과**:
- **API 정합성**: 각 API 함수가 `app/v2/api/routes.py` 정의대로 `/api/v2/...` 엔드포인트 호출 확인
- **상태 일관성**: Mutation 시 관련 쿼리(`v2/inventory`, `vault-status`) 정확히 무효화 확인

### 4. 세그먼트 분류/메시지 발송 ✅

- [x] 세그먼트 룰/결과 저장 및 메시지 인박스 스키마 정의
- [x] V2 세그먼트 배치 트리거 API
- [x] V2 관리자 메시지 생성/팬아웃 API
- [x] Admin MessageSenderPage 구현

**근거**:
- [v2_user_segment_policy_sot_ko.md](../01_core/v2_user_segment_policy_sot_ko.md)
- [v2_admin_message_policy_sot_ko.md](../05_ops/v2_admin_message_policy_sot_ko.md)
- [v2_db_segment_rule_ko.md](../04_db/v2_db_segment_rule_ko.md)
- [routes.py](../../../app/v2/api/routes.py)

### 5. Golden V2 이관 ✅

- [x] Golden V2 API/DB 문서 정리 및 기능 이관
- [x] DB Models, Workers, Redis Infra, API 구현 완료

**근거**:
- [v2_global_sot_verification_report_ko.md](../99_verification/v2_global_sot_verification_report_ko.md)
- [golden_event_service.py](../../../app/v2/services/golden_event_service.py)

---

## Phase 5: 디자인 & 모션 시스템 ⏳

> *목표: "심심하다"는 평가 제거 및 프리미엄 UX 완성 (GSAP + Liquid Glass)*

### 1. 모션 시스템 표준화 (GSAP + CSS) ⏳

**Tech Stack**: Next.js + GSAP 3 (`gsap.context` 사용)

**5대 핵심 모션**:

| 모션 | 설명 |
|------|------|
| **Press** | 버튼/카드 클릭 시 Scale 0.985 → 1 (쫀쫀한 타격감) |
| **Stagger Reveal** | 리스트/카드 0.06s 간격 순차 등장 |
| **Soft Modal** | Backdrop Blur + Scale Up (0.98 → 1) |
| **Count-up** | 숫자/포인트 증가 애니메이션 |
| **Spotlight** | 핵심 보상/CTA에 1회성 강조 (무한 루프 지양) |

### 2. 텔레그램 Liquid Glass & UI 최적화 ⏳

- **Liquid Glass**: 텔레그램 네이티브 배경과 어우러지는 반투명/블러 효과(`backdrop-filter`) 적극 활용
- **Event Hub 구축**: 산발적인 모달을 제거하고 "이벤트 모음 페이지"로 통합 (Top1 추천 + 진행중 리스트)
- **성능 최적화**: `transform`, `opacity` 속성 위주 사용으로 60fps 유지

---

## Phase 6: 텔레그램 통합 및 최종 검증 ⏳

> *목표: 웹에서 검증된 시스템을 텔레그램에 이식*

### 1. 텔레그램 SDK 인젝션 (Bridge) ⏳

- `DevLogin` 비활성화 및 `Telegram WebApp Auth` 활성화
- `viewport` 확장 및 햅틱 피드백 연동

### 2. E2E 테스트 및 부하 테스트 ⏳

- 텔레그램 샌드박스 환경에서 결제/게임 플로우 최종 확인
- 가상 유저 1,000명 부하 테스트

### 3. 데이터 이관 및 컷오버 (Switching) ⏳

- V1 → V2 ETL 스크립트 실행 (Dry Run 필수)
- 점검 후 서비스 교체

---

## 현황 메모 (2026-01-19)

> **"Reverse Sync" 진행 중**: 구현 속도가 계획을 앞질러, 아래 문서가 더 최신입니다.
> - [v2_admin_master_plan_ko.md](../06_design/v2_admin_master_plan_ko.md)
> - [v2_global_sot_verification_report_ko.md](../99_verification/v2_global_sot_verification_report_ko.md)

| 영역 | 상태 | 비고 |
|------|------|------|
| Admin | ✅ 완료 | Foundation, Dashboard, CRM, GameOps, InventoryOps |
| Backend | ✅ 완료 | Golden V2, Redis Infrastructure, DB Models |
| Game | ✅ 완료 | V2 표준 게임 엔진 및 API 구현/검증 |
| SoT 정합성 | ✅ Pass | `sot_consistency_report_20260119_v2.md` |
| Admin/Ops | ✅ 100% | `v2_admin_ops_verification_report_ko.md` |

---

## V2 레거시 갭 (V1 대비 미구현 영역) ✅

| 항목 | 상태 | 비고 |
|------|------|------|
| Auth/User V2 라우트 | ✅ 완료 | dev 전용 `/api/v2/dev/login`만 존재 |

**근거**: [v2_legacy_gap_report_20260119.md](../99_verification/v2_legacy_gap_report_20260119.md)

---

## V1 → V2 스키마 전환 현황 ✅

**기준**: [app/schemas](../../../app/schemas) 내 V1 스키마 전수 (41개 파일, `__init__.py`, `base.py` 제외)

### 마이그레이션 패턴

| 패턴 | 설명 | 예시 |
|------|------|------|
| **Full Migration** | V1 파일을 V2로 완전 이동 | `dice.py` → `v2_dice.py` |
| **Shim Pattern** | V1 파일이 V2를 재수출하여 호환성 유지 | `cc_deposit.py` → `v2_cc_deposit.py` with shim |
| **Dual Existence** | V2 생성, V1 유지 | 대부분의 admin 스키마 |
| **API-Only** | V2 라우트만 생성, 스키마 미전환 | `events.py` 부분 |

### 마이그레이션 현황 요약 ✅

| 구분 | 수량 | 진행률 |
|------|------|--------|
| **완료** | 49개 | 98% |
| **잔여** | 1개 | `base.py` (베이스 클래스, 마이그레이션 불필요) |

**배치별 완료 현황**:
- **1차 (우선순위 5개)**: `vault.py`, `vault2.py`, `ranking.py`, `roulette.py`, `retention_intervention.py`
- **2차 (운영/게임 7개)**: `mission.py`, `ops_log.py`, `ops_plan.py`, `ops_target.py`, `season_pass.py`, `shop_overrides.py`, `survey.py`
- **3차 (유틸리티 5개)**: `team_battle.py`, `telegram.py`, `today_feature.py`, `trial_grant.py`, `user_history.py`
- **최종 (마무리 3개)**: `ui_config.py`, `ui_copy.py`, `admin_feed.py`
- **효율적 커버 (2개)**: `admin_dice.py` → `v2_admin_game_config.py`, `admin_streak_metrics.py` → `v2_admin_streak.py`

<details>
<summary><b>Core Schemas 완료 목록 (28개)</b></summary>

| V1 파일 | V2 파일 | 비고 |
|---------|---------|------|
| activity.py | v2_activity.py | |
| cc_deposit.py | v2_cc_deposit.py | shim pattern |
| dice.py | v2_dice.py | |
| event.py | v2 API routes | |
| exchange.py | v2_exchange.py | |
| external_ranking.py | v2_cc_deposit.py | shim pattern |
| game_tokens.py | v2_game_tokens.py | |
| level_xp.py | v2_level_xp.py | |
| lottery.py | v2_lottery.py | |
| mission.py | v2_mission.py | 2차 배치 |
| ops_log.py | v2_ops_log.py | 2차 배치 |
| ops_plan.py | v2_ops_plan.py | 2차 배치 |
| ops_target.py | v2_ops_target.py | 2차 배치 |
| ranking.py | v2_ranking.py | 우선순위 |
| retention_intervention.py | v2_retention_intervention.py | 우선순위 |
| roulette.py | v2_roulette.py | 우선순위 |
| season_pass.py | v2_season_pass.py | 2차 배치 |
| shop_overrides.py | v2_shop_overrides.py | 2차 배치 |
| survey.py | v2_survey.py | 2차 배치 |
| team_battle.py | v2_team_battle.py | 3차 배치 |
| telegram.py | v2_telegram.py | 3차 배치 |
| today_feature.py | v2_today_feature.py | 3차 배치 |
| trial_grant.py | v2_trial_grant.py | 3차 배치 |
| ui_config.py | v2_ui_config.py | 최종 배치 |
| ui_copy.py | v2_ui_copy.py | 최종 배치 |
| user_history.py | v2_user_history.py | 3차 배치 |
| vault.py | v2_vault.py | 우선순위 |
| vault2.py | v2_vault_program.py | 우선순위 |

</details>

<details>
<summary><b>Admin Schemas 완료 목록 (16개)</b></summary>

| V1 파일 | V2 파일 | 패턴 |
|---------|---------|------|
| admin_dashboard.py | v2_admin_dashboard.py | dual existence |
| admin_dice.py | v2_admin_game_config.py | 효율적 커버 |
| admin_feed.py | v2_admin_feed.py | 최종 배치 |
| admin_feature_schedule.py | v2_admin_feature_schedule.py | dual existence |
| admin_game_config.py | v2_admin_game_config.py | |
| admin_lottery.py | v2_admin_lottery.py | dual existence |
| admin_ranking.py | v2_admin_ranking.py | dual existence |
| admin_roulette.py | v2_admin_roulette.py | dual existence |
| admin_season.py | v2_admin_season.py | dual existence |
| admin_segment.py | v2_admin_segment.py | dual existence |
| admin_segment_rule.py | v2_admin_segment_rule.py | dual existence |
| admin_streak_metrics.py | v2_admin_streak.py | 효율적 커버 |
| admin_streak_rewards.py | v2_admin_streak_rewards.py | dual existence |
| admin_user.py | v2_admin_user.py | dual existence |
| admin_user_summary.py | v2_admin_user_summary.py | dual existence |
| admin_streak.py | v2_admin_streak.py | dual existence |

</details>

<details>
<summary><b>API Routes & Services 완료 목록 (7개)</b></summary>

| 파일 | 경로 |
|------|------|
| admin_routes.py | app/v2/api/admin_routes.py |
| admin_ops_plan.py | app/v2/api/admin_ops_plan.py |
| activity_routes.py | app/v2/api/activity_routes.py |
| admin_cc_deposit.py | app/v2/api/admin_cc_deposit.py |
| events.py | app/v2/api/events.py |
| admin_cc_deposit_service.py | app/v2/services/admin_cc_deposit_service.py |
| admin_external_ranking_service.py | shim pattern |

</details>

**검증 스크립트**: [verify_admin_ops_v2.py](../../../scripts/verify_admin_ops_v2.py)

---

## 버그 박멸 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| **타임존** | ⬜ | DB=UTC, 백엔드 KST 변환, 프론트 KST 표시 일관성 |
| **예외 처리** | ⬜ | 유저 친화적 에러 메시지 |
| **중복 요청** | 🟡 | V2 Shop/Inventory는 Idempotency-Key 필수 강제 |
