# 프로젝트 V2: 마이그레이션 및 리팩토링 로드맵

**목표**: 다음 달부터 시작되는 V2 프로젝트를 위해, 기존 소스 코드를 기반으로(Copy & Refactor) 하되, **"웹 우선 개발(Web-First)"** 전략을 통해 텔레그램 의존성 없이 로직을 완벽하게 검증한 후 통합하는 것을 목표로 합니다.

**범위 (Scope)**: 풀스택 (프론트엔드, 백엔드, 데이터베이스, 인프라) - **모든 영역**
**핵심 전략**:
1.  **V2 브랜치 격리**: `v2-develop` 브랜치(또는 별도 레포지토리)에서 완전히 독립적으로 개발하여 V1 운영에 영향을 주지 않음.
2.  **Web-First & Auth Mocking**: 개발 단계에서는 일반 웹 브라우저 환경에서 동작하는 "가상 로그인"으로 모든 기능을 테스트하고, 마지막 단계에 텔레그램 SDK를 씌웁니다.
3.  **SoT(Source of Truth) 기반 재검증**: 코드를 옮길 때 기존 코드를 그대로 복사하지 않고, 확정된 SoT 문서를 기준으로 "재구현"에 가깝게 검증합니다.

---

## Phase 0: 준비 단계 (이번 달 완료)
*목표: 흔들리지 않는 설계도와 작업 환경 구성*

1.  **V2 브랜치 및 환경 설정**
    *   **Git 전략**: `v2-init` 브랜치 생성 및 `src/v2`, `docs/v2_specs` 디렉토리 구성 완료.
    *   **폴더 구조**: `docs/v2_specs/` (00_sot_meta, 01_core, 02_game, 03_api, 04_db, 05_ops 등) 확립.
    *   [x] V2 디렉토리 구조 생성
    *   [x] V2 문서 규칙 수립 (`01_V2_DOCUMENTATION_RULES.md`)
    *   **진행도**: 완료
    *   **근거**: [docs/v2_specs/00_sot_meta/00_INDEX.md](../00_sot_meta/00_INDEX.md#L1), [docs/v2_specs/00_sot_meta/01_V2_DOCUMENTATION_RULES.md](../00_sot_meta/01_V2_DOCUMENTATION_RULES.md#L1)

2.  **SoT(신뢰원천) 문서 확정 및 한글화**
    *   **Outcome**: 모든 명세의 모호함을 제거하고, 기획 의도를 명확히 한글로 확정.
    *   [x] Core Economy: `v2_vault_glossary`, `v2_strict_vault_policy`, `v2_reward_mapping`, `golden_v2_core_economy_glossary`
    *   [x] Game Specs: `v2_game_action_schema`, `v2_mission_glossary`, `v2_admin_game_config_schema`
    *   [x] Ops Specs: `v2_ops_plan_execution_schema`, `v2_ops_action_glossary`
    *   [x] Infra Specs: `v2_redis_keys_channels`, `02_golden_v2_realtime_architecture`
    *   **진행도**: 완료
    *   **근거**: [docs/v2_specs/01_core/v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md#L1), [docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md](../01_core/v2_strict_vault_policy_sot_ko.md#L1), [docs/v2_specs/01_core/v2_reward_mapping_sot_ko.md](../01_core/v2_reward_mapping_sot_ko.md#L1), [docs/v2_specs/07_golden/golden_v2_core_economy_glossary_ko.md](../07_golden/golden_v2_core_economy_glossary_ko.md#L1), [docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md](../02_game/v2_game_action_schema_sot_ko.md#L1), [docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md](../02_game/v2_mission_glossary_sot_ko.md#L1), [docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md](../02_game/v2_admin_game_config_schema_ko.md#L1), [docs/v2_specs/05_ops/v2_ops_plan_execution_schema_sot_ko.md](../05_ops/v2_ops_plan_execution_schema_sot_ko.md#L1), [docs/v2_specs/05_ops/v2_ops_action_glossary_sot_ko.md](../05_ops/v2_ops_action_glossary_sot_ko.md#L1), [docs/v2_specs/01_core/v2_redis_keys_channels_sot_ko.md](../01_core/v2_redis_keys_channels_sot_ko.md#L1), [docs/v2_specs/07_golden/02_golden_v2_realtime_architecture.md](../07_golden/02_golden_v2_realtime_architecture.md#L1), [docs/v2_specs/01_core/v2_ticket_enum_code_alignment_sot_ko.md](../01_core/v2_ticket_enum_code_alignment_sot_ko.md#L1), [docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md](../01_core/v2_reward_type_standard_sot_ko.md#L1), [docs/v2_specs/01_core/v2_level_point_storage_sot_ko.md](../01_core/v2_level_point_storage_sot_ko.md#L1), [docs/v2_specs/02_game/v2_team_battle_sot_ko.md](../02_game/v2_team_battle_sot_ko.md#L1)

3.  **API 전수 조사 및 보안 감사**
    *   **Task**: 현재 V1의 모든 API 리스트업 (Swagger 추출).
    *   **Status**: `docs/v2_specs/03_api/v1_legacy_api_list_ko.md` 작성 완료 + 불일치 리포트 최신 검증 반영 완료 (Critical 보안 이슈 식별).
    *   [x] V1 Swagger 추출 (`v1_legacy_api_list.json`)
    *   [x] 보안 취약점 감사 (Dev Endpoint 노출 확인)
    *   [x] 불일치 리포트 최신 API 리스트 기준 검증 반영
    *   **진행도**: 완료
    *   **근거**: [docs/v2_specs/03_api/v1_legacy_api_list_ko.md](../03_api/v1_legacy_api_list_ko.md#L1), [docs/v2_specs/03_api/v1_legacy_api_list.json](../03_api/v1_legacy_api_list.json#L1), [docs/v2_specs/03_api/v1_api_discrepancy_report.md](../03_api/v1_api_discrepancy_report.md#L1), [docs/v2_specs/03_api/v1_api_discrepancy_report_ko.md](../03_api/v1_api_discrepancy_report_ko.md#L1)

---

## Phase 1: 기반 구축 (다음 달 1주차)
*목표: 텔레그램 없이도 돌아가는 강력한 백엔드와 테스트 환경*

4.  **Web-First 인증 시스템 (Mock Auth)**
    *   **개념**: 텔레그램 `initData`가 없어도 개발자/테스터가 로그인할 수 있는 `DevLogin` 기능 구현.
    *   **구현**: `POST /api/v2/dev/login` (프로덕션 환경변수로 차단).
    *   **이점**: 프론트엔드 개발자가 Chrome 모바일 뷰에서 쾌적하게 개발 및 디버깅 가능.
    *   [x] DevLogin 엔드포인트 구현
    *   **진행도**: 완료
    *   **근거**: [app/api/routes/dev_login.py](../../../app/api/routes/dev_login.py#L1-L83), [app/api/routes/__init__.py](../../../app/api/routes/__init__.py#L47-L50)

5.  **Strict Type & Schema 정의**
    *   **Action**: Phase 0에서 확정한 문서를 코드로 변환 (Pydantic & Zod).
    *   **원칙**: `any` 타입 절대 금지. 모든 입/출력 데이터는 스키마에 의해 검증되어야 함.
    *   [x] 스키마 SoT 문서 정리 완료
    *   [x] Pydantic/Zod 코드 변환 (Progression → Game Action → Admin Game Config → Notification Feed)
    *   **진행도**: 진행중 (4개 스키마 코드 완료)
    *   **근거**: [docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md](../02_game/v2_game_action_schema_sot_ko.md#L1), [docs/v2_specs/01_core/v2_progression_schema_ko.md](../01_core/v2_progression_schema_ko.md#L1), [docs/v2_specs/03_api/v2_notification_feed_schema_ko.md](../03_api/v2_notification_feed_schema_ko.md#L1), [docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md](../02_game/v2_admin_game_config_schema_ko.md#L1), [app/v2/schemas/v2_progression.py](../../../app/v2/schemas/v2_progression.py#L1), [app/v2/schemas/v2_game_action.py](../../../app/v2/schemas/v2_game_action.py#L1), [app/v2/schemas/v2_admin_game_config.py](../../../app/v2/schemas/v2_admin_game_config.py#L1), [app/v2/schemas/v2_notification_feed.py](../../../app/v2/schemas/v2_notification_feed.py#L1), [src/v2/types/enums.ts](../../../src/v2/types/enums.ts#L1), [src/v2/types/progression.ts](../../../src/v2/types/progression.ts#L1), [src/v2/types/gameAction.ts](../../../src/v2/types/gameAction.ts#L1), [src/v2/types/adminGameConfig.ts](../../../src/v2/types/adminGameConfig.ts#L1), [src/v2/types/notificationFeed.ts](../../../src/v2/types/notificationFeed.ts#L1)

6.  **데이터베이스 재설계 (V2 Schema)**
    *   `dirty`한 컬럼명 정리, 인덱스 최적화.
    *   **Money Integrity**: `Check Constraint (balance >= 0)` 설정 필수.
    *   [x] Money Integrity 체크 제약 추가
    *   **마이그레이션 전략**: 다음달 완전 리셋 배포 전제 → **베이스라인 스냅샷 1개 + 이후 최소 누적**
    *   **진행도**: 진행중 (V2 DB 기준 마이그레이션 적용 완료, head=20260119_1600)
    *   **근거**: [alembic/versions/20260119_0904_3bc52f37e0c0_baseline_v2_snapshot.py](../../../alembic/versions/20260119_0904_3bc52f37e0c0_baseline_v2_snapshot.py#L1), [alembic/versions/20260119_1000_add_v2_level_reward_table.py](../../../alembic/versions/20260119_1000_add_v2_level_reward_table.py#L1), [alembic/versions/20260119_1100_add_v2_ticket_conversion_policy.py](../../../alembic/versions/20260119_1100_add_v2_ticket_conversion_policy.py#L1), [alembic/versions/20260119_1200_add_v2_shop_exchange_ticketzero_ops_tables.py](../../../alembic/versions/20260119_1200_add_v2_shop_exchange_ticketzero_ops_tables.py#L1), [alembic/versions/20260119_1400_add_v2_user_table.py](../../../alembic/versions/20260119_1400_add_v2_user_table.py#L1), [alembic/versions/20260119_1500_add_v2_game_tables.py](../../../alembic/versions/20260119_1500_add_v2_game_tables.py#L1), [docs/v2_specs/04_db/v2_db_level_reward_table_ko.md](../04_db/v2_db_level_reward_table_ko.md#L1), [docs/v2_specs/04_db/v2_db_ticket_conversion_policy_ko.md](../04_db/v2_db_ticket_conversion_policy_ko.md#L1), [docs/v2_specs/04_db/v2_db_shop_order_ko.md](../04_db/v2_db_shop_order_ko.md#L1), [docs/v2_specs/04_db/v2_db_exchange_log_ko.md](../04_db/v2_db_exchange_log_ko.md#L1), [docs/v2_specs/04_db/v2_db_ticket_zero_log_ko.md](../04_db/v2_db_ticket_zero_log_ko.md#L1), [docs/v2_specs/04_db/v2_db_ops_execution_result_ko.md](../04_db/v2_db_ops_execution_result_ko.md#L1), [docs/v2_specs/04_db/v2_db_user_ko.md](../04_db/v2_db_user_ko.md#L1), [docs/v2_specs/04_db/v2_db_roulette_ko.md](../04_db/v2_db_roulette_ko.md#L1), [docs/v2_specs/04_db/v2_db_dice_ko.md](../04_db/v2_db_dice_ko.md#L1), [docs/v2_specs/04_db/v2_db_lottery_ko.md](../04_db/v2_db_lottery_ko.md#L1)
    *   **운영 주의**: 컨테이너 기본 DB는 V1일 수 있으므로, V2 작업은 `DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/v2`로 실행

---

## **[Critical] V2 Independent Folder Structure Strategy**
**Objective**: Build a clean, independent V2 codebase (`app/v2`, `src/v2`) separate from V1 legacy.

1.  **Directory Structure**:
    - **Backend**: `app/v2/` (Models, Schemas, API Routes, Services, Utils)
    - **Frontend**: `src/v2/` (Types, API Clients, Components, Hooks)
    - **Database**: Independent `Base` class for V2 models to allow isolated Alembic migrations.

2.  **Migration Actions**:
    - Move existing V2 schemas/types to `app/v2/schemas` and `src/v2/types`.
    - Create `app/v2/models` for fresh ORM definitions (unbound from V1 Base).
    - Update `alembic.env` to utilize V2 metadata.
    - **Minimal Patch Strategy**: No refactoring of V1, strictly "Create New & Move".

---

## Phase 2: 코어 경제 및 금고 로직 (2주차)
*목표: 돈과 관련된 로직의 무결성 확보 (TDD 필수)*
**[구현 계획서 바로가기](./v2_phase2_core_economy_plan.md)**

### Phase 2 상태
- **Unblock**: [BLOCKING] Wait for External AI: DB Snapshot (v2) 완료 처리
- **Status Change**: Phase 2를 EXECUTION 상태로 전환

### Phase 2 선행 작업 반영
2. **V2 독립 폴더 구조 생성 (Folder Setup)**
    - Backend: `app/v2` 하위 `models`, `schemas`, `services`, `api`, `utils` 디렉토리 생성 완료
    - Frontend: `src/v2` 하위 `types`, `api`, `components`, `hooks` 디렉토리 생성 완료
    - Action: PowerShell `New-Item`로 안전 생성

3. **스키마 및 타입 이관 (Clean & Move)**
    - Backend Schemas: `app/v2_*.py` → `app/v2/schemas/`로 이동 및 리네임 완료
    - Frontend Types: `src/types/v2/*` 및 루트 V2 타입 → `src/v2/types/`로 통합 이동 완료
    - Alembic Config: `alembic.env.py`가 V2 메타데이터를 참조하도록 전환 완료

4. **핵심 경제 로직 구현 (TDD Start)**
    - Target: Vault Consistency (금고 무결성)
    - Step 1: `tests/v2/core/test_vault_consistency.py` 작성 (완료)
    - Step 2: `app/v2/models/user.py` (V2 User 모델) 정의 및 `vault_locked_balance` 엄격 적용 (완료)
    - Step 3: 테스트 통과 및 검증 (완료)
    - 산출물: V2 User SoT 문서 및 V2 DB User 스키마 문서 생성 완료

7.  **User Ledger & Vault (TDD)**
    *   **원칙**: 테스트 코드(Test Case) 작성 후 개발.
    *   **검증**: 입금(외부 랭킹 동기화), 출금(Strict Policy 일치 여부), 동시성(따닥 방지).
    *   **진행도**: EXECUTION (Vault Consistency TDD 완료)

8.  **상점(Shop) 및 인벤토리**
    *   트랜잭션 원자성(Atomicity) 보장. 구매와 인벤토리 지급, 차감이 한 호흡으로 동작.
    * 입금 루틴: 외부 랭킹 서버 데이터 수신 후 DB 반영 로직 검증.
        *   출금 루틴: Strict Policy(당일 입금 확인, 활동성 체크) 로직 검증.
        *   동시성 테스트: 0.1초 간격으로 10번 구매 요청 시 1번만 결제되는지 확인.
   "구매 -> 인벤토리 지급 -> 차감" 트랜잭션의 원자성(Atomicity) 보장 구현.
    *   기존의 복잡한 아이템 로직을 단순화하되 확장성 있게 재구성.
    *   **v2_shop_products UI Config 미설정 시 상점 목록이 빈 배열로 반환됨** → 운영/개발 환경에서 키 설정 필수.
    *   **Status**: V1 데이터 기반 변환 및 검증 완료 (`sot_verification_report_shop.md`).
    *   **진행도**: EXECUTION (Shop/Inventory TDD 전환 완료, 상품 데이터 마이그레이션 완료)


### 현황 메모
현재 출금시에 유저금고 / 어드민회원페이지 / 어드민금고페이지에서 각각 다른 금액이 도출됨
금고락인금액 / 금고가용금액이 더블로 계산되어 나오는 경우도 존재했고
그냥 한마디로 엉망이었음
정확한 로직과 규칙 준수가 절실하고 프론트 반영까지 모두 확인되어야함

### 추가 계획
#### 1) 상점/인벤토리 서비스 레이어 설계 확정 (진행 중)
- 상태: **완료** (설계 확정 및 TDD 케이스 정리 완료)
- 작업 내용:
    - ShopService 구매 플로우 확정(차감 → 로그 → 지급)
    - InventoryService 교환/지급 흐름 확정
    - 실패/롤백 케이스 목록화
- 산출물:
    - 서비스 인터페이스 명세서
    - TDD 케이스 목록
    - 근거: [docs/v2_specs/01_core/v2_shop_inventory_service_design_ko.md](../01_core/v2_shop_inventory_service_design_ko.md#L1)

#### 2) Ticket Zero 로직 API 계약서/테스트 초안 (미착수)
- 상태: **진행 중** (API 계약서 초안/테스트 초안 작성 완료)
- 작업 내용:
    - `GET /status` 응답 계약(bailout_available 플래그)
    - `POST /api/retention/bailout` 요청/응답 스키마 정의
    - 쿨다운/잔액/미수령 조건 테스트 초안
- 산출물:
    - API 계약서 초안
    - 테스트 케이스 초안
    - 근거: [docs/v2_specs/03_api/v2_ticket_zero_api_contract_ko.md](../03_api/v2_ticket_zero_api_contract_ko.md#L1)

#### 3) Ops 실행 결과 저장/조회 API 스펙/어드민 연동 (미착수)
- 상태: **진행 중** (API 스펙/연동 범위 초안 작성 완료)
- 작업 내용:
    - 결과 저장/조회 API 스펙 정의
    - 어드민 화면 연동 범위 결정
    - payload_json 표시/검색 기준 합의
- 산출물:
    - API 스펙 문서
    - 어드민 연동 범위 정의
    - 근거: [docs/v2_specs/05_ops/v2_ops_execution_api_contract_ko.md](../05_ops/v2_ops_execution_api_contract_ko.md#L1)

#### 4) V2 전용 마이그레이션 스냅샷 재생성 기준 수립 (미착수)
- 상태: **완료** (기준/절차 문서화 완료)
- 작업 내용:
    - 배포 전 clean snapshot 생성 기준 정리
    - 스냅샷 생성/적용 절차 문서화
    - 기준 리비전 고정 규칙 수립
- 산출물:
    - 스냅샷 기준 문서
    - 근거: [docs/v2_specs/04_db/v2_db_snapshot_regeneration_policy_ko.md](../04_db/v2_db_snapshot_regeneration_policy_ko.md#L1)

## Phase 3: 게임 및 컨텐츠 (3주차)
*목표: 웹 환경에서 게임 로직 완벽 검증*
**완료됨**
9.  **게임 엔진 표준화 (Game Engine V2)**
    *   룰렛, 주사위, 복권 로직 추상화 및 Config Schema 강제 적용.
    *   룰렛, 주사위, 복권의 공통 로직(입장 -> 결과 산출 -> 보상 지급)을 추상화.
    *   **진행도**: 진행중
    *   **근거**: [docs/v2_specs/02_game/v2_game_engine_standardization_design_ko.md](../02_game/v2_game_engine_standardization_design_ko.md#L1), [docs/v2_specs/02_game/v2_game_engine_sot_ko.md](../02_game/v2_game_engine_sot_ko.md#L1), [docs/v2_specs/03_api/v2_game_api_contract_ko.md](../03_api/v2_game_api_contract_ko.md#L1)
    *   **검증**: V2 core 테스트 16건 통과 (2026-01-19)
    *   **검증**: V2 게임 API /api/v2/{game}/status|play 스모크 테스트 통과 (tests/v2/core/test_v2_game_api_flow.py) 

10. **프론트엔드-백엔드 연동 (Web Ver.)**
    *   표준 Web API로 게임 플레이 연동 및 Network 탭 검증.
    *   **진행도**: 미착수

---

## Phase 4: 어드민 및 운영 도구 (3주차 후반)
*목표: 운영자가 신뢰할 수 있는 제어판*

11. **Admin V2 재구축**
    *   RBAC(권한 관리)가 적용된 엄격한 어드민.
    *   기존 운영툴(응대 플레이북, 위기 레이더) DB 연결.
    *   **진행도**: 미착수

12. **세그먼트 분류/메시지 발송 V2 SoT/DB 구성**
    *   세그먼트 룰/결과 저장 및 메시지 인박스 스키마 정의.
    *   **작업 내용**:
        - V2 세그먼트 배치 트리거 API
        - V2 관리자 메시지 생성/팬아웃 API
    *   **진행도**: 진행중 (SoT/DB 스키마 초안 완료)
    *   **검증**: 마이그레이션 적용 완료 (revision 20260119_1600)
    *   **근거**: [docs/v2_specs/01_core/v2_user_segment_policy_sot_ko.md](../01_core/v2_user_segment_policy_sot_ko.md#L1), [docs/v2_specs/05_ops/v2_admin_message_policy_sot_ko.md](../05_ops/v2_admin_message_policy_sot_ko.md#L1), [docs/v2_specs/04_db/v2_db_segment_rule_ko.md](../04_db/v2_db_segment_rule_ko.md#L1), [docs/v2_specs/04_db/v2_db_user_segment_ko.md](../04_db/v2_db_user_segment_ko.md#L1), [docs/v2_specs/04_db/v2_db_admin_message_ko.md](../04_db/v2_db_admin_message_ko.md#L1), [docs/v2_specs/04_db/v2_db_admin_message_inbox_ko.md](../04_db/v2_db_admin_message_inbox_ko.md#L1), [app/v2/api/routes.py](../../../app/v2/api/routes.py#L1)

13. **Golden V2 이관 (문서/기능)**
    *   Golden V2 API/DB 문서 정리 및 기능 이관.
    *   **진행도**: 완료 (문서 경로 이동 및 V2 라우트 이관 완료)
    *   **근거**: [docs/v2_specs/07_golden/golden_v2_system_definition_ko.md](../07_golden/golden_v2_system_definition_ko.md#L1), [docs/v2_specs/07_golden/golden_v2_intervention_logic_ko.md](../07_golden/golden_v2_intervention_logic_ko.md#L1), [docs/v2_specs/07_golden/golden_v2_operational_logic_ko.md](../07_golden/golden_v2_operational_logic_ko.md#L1), [docs/v2_specs/07_golden/02_golden_v2_realtime_architecture.md](../07_golden/02_golden_v2_realtime_architecture.md#L1), [docs/v2_specs/07_golden/v2_golden_api_contract_ko.md](../07_golden/v2_golden_api_contract_ko.md#L1), [docs/v2_specs/07_golden/v2_db_golden_data_map_ko.md](../07_golden/v2_db_golden_data_map_ko.md#L1), [app/v2/api/routes.py](../../../app/v2/api/routes.py#L1)


## Phase 5: 디자인 & 모션 시스템 검증 (4주차 초반)
*목표: "심심하다"는 평가 제거 및 프리미엄 UX 완성 (GSAP + Liquid Glass)*

14. **모션 시스템 표준화 (GSAP + CSS)**
    *   **Tech Stack**: Next.js + GSAP 3 (gsap.context 사용).
    *   **5대 핵심 모션 적용**:
        1.  **Press**: 버튼/카드 클릭 시 Scale 0.985 -> 1 (쫀쫀한 타격감).
        2.  **Stagger Reveal**: 리스트/카드 0.06s 간격 순차 등장.
        3.  **Soft Modal**: Backdrop Blur + Scale Up (0.98 -> 1).
        4.  **Count-up**: 숫자/포인트 증가 애니메이션.
        5.  **Spotlight**: 핵심 보상/CTA에 1회성 강조 (무한 루프 지양).
    *   **진행도**: 미착수

15. **텔레그램 Liquid Glass & UI 최적화**
    *   **Liquid Glass**: 텔레그램 네이티브 배경과 어우러지는 반투명/블러 효과(`backdrop-filter`) 적극 활용.
    *   **Event Hub 구축**: 산발적인 모달을 제거하고 "이벤트 모음 페이지"로 통합. (Top1 추천 + 진행중 리스트 구조).
    *   **성능 최적화**: `transform`, `opacity` 속성 위주 사용으로 60fps 유지.
    *   **진행도**: 미착수

---

## Phase 6: 텔레그램 통합 및 최종 검증 (말일)
*목표: 웹에서 검증된 시스템을 텔레그램에 이식*

16. **텔레그램 SDK 인젝션 (Bridge)**
    *   `DevLogin` 비활성화 및 `Telegram WebApp Auth` 활성화.
    *   `viewport` 확장 및 햅틱 피드백 연동.
    *   **진행도**: 미착수

17. **E2E 테스트 및 부하 테스트**
    *   텔레그램 샌드박스 환경에서 결제/게임 플로우 최종 확인.
    *   가상 유저 1,000명 부하 테스트.
    *   **진행도**: 미착수

18. **데이터 이관 및 컷오버 (Switching)**
    *   V1 -> V2 ETL 스크립트 실행 (Dry Run 필수).
    *   점검 후 서비스 교체.
    *   **진행도**: 미착수

---

## 버그 박멸 체크리스트 (Subtle Bugs)

- [ ] **소수점 문제**: Decimal 타입 사용 여부.
- [ ] **타임존**: DB=UTC 원칙 준수 여부.
- [ ] **예외 처리**: 유저 친화적 에러 메시지.
- [ ] **중복 요청**: 프론트/백엔드 이중 따닥 방지.
- [ ] **모션 성능**: 저사양 기기에서 애니메이션 렉 발생 여부 확인.
