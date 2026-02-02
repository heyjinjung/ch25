문서 타입: 인덱스

## 0. 핵심/최신 일관성 체크아웃 (Code/Ops Consistency)

---
### [2026-01-30 운영 서버 검증 결과]
- **검증 시간**: 2026-01-30 17:45~17:51 KST
- **검증 방법**: SSH `root@149.28.135.147` 접속 후 docker/curl 명령 실행

| 항목 | 상태 | 검증 결과 |
|------|------|-----------|
| API Health (`/health`) | ✅ OK | "healthy" |
| V2 API Health (`/api/v2/health`) | ✅ OK | `{"status":"ok"}` |
| Telegram Bot | ✅ OK | Webhook 설정 완료, Application started |
| Redis | ✅ OK | PONG 응답 |
| DEV Login | ✅ 차단됨 | 404 Not Found (엔드포인트 없음) |
| Celery Worker/Beat | ⚠️ 완화됨 | 헬스체크/pidfile 수정 (운영 배포 필요) |
| V1 Auth | ⚠️ 완화됨 | `auth.py` password_hash 가드 추가 (운영 배포 필요) |
| Circuit Breaker | ⏳ 대기 | 아직 사용 전 (키 없음) |

**미해결 이슈**:
- `auth.py:64`: V1 Auth 라우터 password_hash 가드 적용 완료(로컬), 운영 배포 필요
- Celery healthcheck: pidfile 기준 헬스체크로 수정 완료(로컬), 운영 배포 필요

### [2026-01-30 배포 트러블슈팅 및 저장소 이관]
- **저장소 이관 완료**: `heyjinjung/ch25` → `jm956-cc/202601_app` (전체 브랜치/태그/히스토리 이관)
- **배포 이슈 해결** (deploy.yml, docker-compose.yml, migration 수정):
  - Dockerfile SCP 복사 누락 → `Dockerfile.backend`, `Dockerfile.frontend` 추가
  - celery-worker/beat 빌드 실패 → `image: ghcr.io/.../xmas-backend:latest` 추가
  - 프로덕션 볼륨 마운트 오류 → 개발용 볼륨을 `docker-compose.override.yml`로 분리
  - MySQL `ADD COLUMN IF NOT EXISTS` 미지원 → `column_exists()` 함수로 수정
  - Mission Stats 500 에러 → 잘못된 `type_descriptor` 코드 제거
- **목업 데이터 정리**: 수익/지출, 재고 데이터 로컬 DB에서 삭제
- **트러블슈팅 문서**: [0000_2026_v2_deployment_troubleshooting_guide_ko.md](docs/v2_specs/00_sot_meta/0000_2026_v2_deployment_troubleshooting_guide_ko.md)

### [2026-01-28 금고 정책 SoT 승격 내역]
- learned_/vault/20260128_vault_balance_sync_update.md: V1/V2 금고 잔액 동기화 정책, 서비스/테스트 케이스 개선, pytest 통과
- learned_/vault/20260127_vault_today_spent_shop_purchase_update.md, learned_/vault/20260127_vault_daily_spent_tracks_v2_shop_purchase.md: 상점 구매 시 vault_spent_today/total 누적/리셋, 원장 기록, V2User 동기화, 테스트 케이스 보강
- learned_/vault/20260127_vault_withdrawal_modal_condition_delivery_fix.md: API 응답 필드 정규화, 프론트 타입/어댑터 보강, UI 검증
- learned_/vault/20260127_dice_vault_deduction_fix.md: 게임 결과별 금고 차감 정책, 서비스 로직/테스트 케이스 보강
각 diff의 적용일자/핫픽스/테스트 결과를 SoT 변경 이력에 기록함
- **통합 컨텍스트**: [learned_/00_con.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md)
- **도메인별 최신 Learned SoT**:
  - **Auth/User**: [auth.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/auth.md) | [02.user.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/user/02.user.md) | [User 가이드](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/user/user_consistency_guide.md) | [잠재유저 매칭](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/user/20260202_prospect_linking_implementation.md)
  - **Admin**: [01.admin.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/admin/01.admin.md) | [Admin 가이드](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/admin/01.adminguide.md)
  - **Game**: [03.game.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/03.game.md) | [금고 정책](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/01_strict_vault_policy.md) | [복권 상금 수정](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/20260127_lottery_prize_partial_update_fix.md) | [복권 UI/BE 싱크](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/20260205_lottery_ui_backend_tier_sync.md)
  - **Inventory**: [05.inventory.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/inventory/05.inventory.md) | [인벤 패치 가이드](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/inventory/05.inventory_patch_guide.md)
  - **Mission**: [09.mission.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md) | [빌더 규칙](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/20260127_mission_admin_builder_rules_update.md) | [자동 LogicKey](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/20260127_mission_builder_auto_logickey_update.md)
  - **Shop**: [06.shop.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/shop/06.shop.md) | [상점 비용 수정](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/shop/20260127_shop_cost_type_fix.md)
  - **Vault**: [08.vault.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/vault/08.vault.md) | [플레이 횟수 업데이트](docs/v2_specs/00_sot_meta/vault/20260127_vault_play_count_update.md) | [주사위 차감 수정](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/vault/20260127_dice_vault_deduction_fix.md)
  - **Team Battle**: [04.team_battle.md](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/teambattle/04.team_battle.md) | [닉네임 조회 수정](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/teambattle/20260126_team_battle_nickname_lookup_update.md)

## 1. 도메인별 기본 SoT (Legacy/Standard)
- 팀배틀 SoT: docs/v2_specs/02_game/v2_team_battle_sot_ko.md
- 티켓 Enum SoT: docs/v2_specs/01_core/v2_ticket_enum_sot_ko.md
- 티켓 Enum 코드 정합 SoT: docs/v2_specs/01_core/v2_ticket_enum_code_alignment_sot_ko.md
- 레벨포인트 SoT: docs/v2_specs/01_core/v2_level_point_sot_ko.md
- 레벨포인트 저장 필드 SoT: docs/v2_specs/01_core/v2_level_point_storage_sot_ko.md
- Redis 키/채널 SoT: docs/v2_specs/01_core/v2_redis_keys_channels_sot_ko.md
- 보상 매핑 SoT: docs/v2_specs/01_core/v2_reward_mapping_sot_ko.md
- RewardType 표준 SoT: docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
- 금고 용어 SoT: docs/v2_specs/01_core/v2_vault_glossary_sot_ko.md
- V2 User SoT: docs/v2_specs/01_core/v2_user_sot_ko.md
- 레벨 보상표 SoT: docs/v2_specs/01_core/v2_level_reward_table_sot_ko.md
- 기프티콘 네이밍 SoT: docs/v2_specs/01_core/v2_gifticon_naming_sot_ko.md
- 만능티켓 변환 SoT: docs/v2_specs/01_core/v2_ticket_conversion_sot_ko.md
- 레벨포인트 확장 SoT: docs/v2_specs/01_core/v2_level_point_extension_sot_ko.md
- **아이템/인벤토리 SoT**: docs/v2_specs/01_core/v2_item_inventory_sot_ko.md
- **상점/교환소 정책 SoT**: docs/v2_specs/01_core/v2_shop_exchange_policy_sot_ko.md
- 상점/인벤토리 서비스 설계: docs/v2_specs/01_core/v2_shop_inventory_service_design_ko.md
- 상점 상품 UI Config SoT: docs/v2_specs/05_ops/v2_shop_products_ui_config_sot_ko.md
- **V1→V2 상점 상품 변환 가이드**: docs/v2_specs/99_verification/v1_to_v2_shop_products_conversion_ko.md
- **V1->V2 상점 이관 검증 보고서**: docs/v2_specs/99_verification/sot_verification_report_shop.md
- 어드민 게임 설정 스키마 SoT: docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md
- 검증/세그먼트 So# Tasks

- [x] Consolidate Monitoring & Analytics menu structure
- [x] Fix HQ Margin CSV import encoding issues
- [x] Improve User Detail Drawer with Vault and Game Logs
- [x] Fix GameLogItemDto key error (segment_index -> segment_id)
# Tasks

- [x] Consolidate Monitoring & Analytics menu structure
- [x] Fix HQ Margin CSV import encoding issues
- [x] Improve User Detail Drawer with Vault and Game Logs
- [x] Fix GameLogItemDto key error (segment_index -> segment_id)
- [x] Localize User Inventory Item Names
  - [x] Update `InventoryPage.tsx` to use `getRewardItemLabel`
  - [x] Verify Korean item names in User Inventory Page
- [ ] Final verification and documentation update
- 게임 API 계약: docs/v2_specs/03_api/v2_game_api_contract_ko.md
- Auth/User API 계약: docs/v2_specs/03_api/v2_auth_user_api_contract_ko.md
- Mission/Streak API 계약: docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md
- Inventory/Shop API 계약: docs/v2_specs/03_api/v2_inventory_shop_api_contract_ko.md
- **지갑/금고/인벤 로그 라우터 요약**: docs/v2_specs/03_api/v2_economy_asset_log_routes_ko_v1.0.md
- Team Battle API 계약: docs/v2_specs/03_api/v2_team_battle_api_contract_ko.md
- Admin/Ops API 계약: docs/v2_specs/03_api/v2_admin_ops_api_contract_ko.md
- Golden V2 API 계약: docs/v2_specs/07_golden/v2_golden_api_contract_ko.md
- Ticket Zero API 계약: docs/v2_specs/03_api/v2_ticket_zero_api_contract_ko.md
- **V1 Legacy API 감사**: docs/v2_specs/03_api/v1_legacy_api_list_ko.md (보안감사 포함)
- **V1 API 불일치 리포트**: docs/v2_specs/03_api/v1_api_discrepancy_report_ko.md (Deep Audit)
- 미션 용어 SoT: docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md
- 게임 엔진 SoT: docs/v2_specs/02_game/v2_game_engine_sot_ko.md
- **신규 유저 미션 로직 SoT**: docs/v2_specs/02_game/v2_new_user_mission_logic_sot_ko.md
- 게임 액션 스키마 SoT: docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md
- 게임 엔진 표준화 설계: docs/v2_specs/02_game/v2_game_engine_standardization_design_ko.md
- Ops Plan 실행 스키마 SoT: docs/v2_specs/05_ops/v2_ops_plan_execution_schema_sot_ko.md
- Ops Action 용어집 SoT: docs/v2_specs/05_ops/v2_ops_action_glossary_sot_ko.md
- 운영 메시지 정책 SoT: docs/v2_specs/05_ops/v2_admin_message_policy_sot_ko.md
- Ops 실행 결과 API 계약: docs/v2_specs/05_ops/v2_ops_execution_api_contract_ko.md
- 강력한 금고 정책 SoT: docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md
- 프로그레션/레벨 스키마 SoT: docs/v2_specs/01_core/v2_progression_schema_ko.md
- **Golden System 정의서**: docs/v2_specs/07_golden/golden_v2_system_definition_ko.md
- **Golden 개입 로직 SoT**: docs/v2_specs/07_golden/golden_v2_intervention_logic_ko.md
- **Golden Ops 로직 SoT**: docs/v2_specs/07_golden/golden_v2_operational_logic_ko.md
- **골든아워 정책 SoT**: docs/v2_specs/07_golden/v2_golden_hour_policy_sot_ko.md
- **출석 스트릭 로직 SoT**: docs/v2_specs/02_game/v2_attendance_streak_logic_sot_ko.md
- **티켓 제로(구조) SoT**: docs/v2_specs/02_game/v2_ticket_zero_policy_sot_ko.md
- V2 DB 베이스라인 스냅샷: docs/v2_specs/04_db/v2_db_baseline_snapshot_ko.md
- V2 DB 레벨 보상 테이블: docs/v2_specs/04_db/v2_db_level_reward_table_ko.md
- V2 DB User: docs/v2_specs/04_db/v2_db_user_ko.md
- V2 DB 티켓 전환 정책: docs/v2_specs/04_db/v2_db_ticket_conversion_policy_ko.md
- V2 DB 상점 주문 로그: docs/v2_specs/04_db/v2_db_shop_order_ko.md
- V2 DB 교환소 로그: docs/v2_specs/04_db/v2_db_exchange_log_ko.md
- V2 DB 티켓 제로 로그: docs/v2_specs/04_db/v2_db_ticket_zero_log_ko.md
- V2 DB Ops 실행 결과: docs/v2_specs/04_db/v2_db_ops_execution_result_ko.md
- **CC 입금/외부 랭킹 SoT**: docs/v2_specs/01_core/v2_cc_deposit_sot_ko.md
- V2 DB 룰렛: docs/v2_specs/04_db/v2_db_roulette_ko.md
- V2 DB 주사위: docs/v2_specs/04_db/v2_db_dice_ko.md
- V2 DB 복권: docs/v2_specs/04_db/v2_db_lottery_ko.md
- V2 DB Golden 데이터 맵: docs/v2_specs/07_golden/v2_db_golden_data_map_ko.md
- V2 DB 세그먼트 규칙: docs/v2_specs/04_db/v2_db_segment_rule_ko.md
- V2 DB 유저 세그먼트: docs/v2_specs/04_db/v2_db_user_segment_ko.md
- V2 DB 관리자 메시지: docs/v2_specs/04_db/v2_db_admin_message_ko.md
- V2 DB 관리자 메시지 인박스: docs/v2_specs/04_db/v2_db_admin_message_inbox_ko.md
- V2 DB 스냅샷 재생성 정책: docs/v2_specs/04_db/v2_db_snapshot_regeneration_policy_ko.md

## 5. Troubleshooting
- (DB/Alembic) docs/v2_specs/90_troubleshooting/v2_troubleshooting_20260120_alembic_legacy_ko.md
- (Backend Runtime) docs/v2_specs/90_troubleshooting/v2_troubleshooting_20260120_backend_runtime_ko.md
- (Frontend Startup) docs/v2_specs/90_troubleshooting/v2_troubleshooting_20260120_frontend_startup_ko.md
- (Admin UI Undefined Error) docs/v2_specs/90_troubleshooting/v2_troubleshooting_20260120_undefined_error_ko.md
- (Ticket/Inventory Search)# Localization: User Inventory Item Names

Implement Korean localization for inventory item names in the user-facing inventory page by adhering to SOT standards.

## Proposed Changes

### [User Frontend]

#### [MODIFY] [InventoryPage.tsx](file:///C:/Users/JAVIS/ch/ch25/src/v2/pages/inventory/InventoryPage.tsx)
- Replace local `ITEM_NAME_MAP` and `getFriendlyItemName` with `getRewardItemLabel` from `src/v2/constants/rewardItems.ts`.
- Ensure all item types (including vouchers and gifticons) are correctly localized using the centralized mapping.
md
- (CSV Import) docs/v2_specs/90_troubleshooting/v2_csv_import_pipeline_guide_ko.md
- **(배포 트러블슈팅 가이드)** docs/v2_specs/00_sot_meta/0000_2026_v2_deployment_troubleshooting_guide_ko.md

## 5.1 V2 Admin 라우터 모듈(코드 맵)
- 라우터 엔트리: app/v2/api/routes.py (admin_router include)
- Admin 라우터 집계: app/v2/api/admin/__init__.py (prefix=/admin)
- 모듈 라우터
	- app/v2/api/admin/economy_routes.py
	- app/v2/api/admin/game_config_routes.py
	- app/v2/api/admin/inventory_routes.py
	- app/v2/api/admin/level_routes.py
	- app/v2/api/admin/marketing_routes.py
	- app/v2/api/admin/mission_routes.py
	- app/v2/api/admin/ops_routes.py
	- app/v2/api/admin/segment_routes.py
	- app/v2/api/admin/user_routes.py
	- app/v2/api/admin/vault_routes.py
	- app/v2/api/admin/csv_import_routes.py
	- app/v2/api/admin_cc_deposit.py
	- app/v2/api/admin_ops_plan.py

## 6. 운영/검증 (QA)
- 프론트엔드 마스터 플랜: docs/v2_specs/06_design/v2_frontend_master_plan_ko.md
- 어드민 마스터 플랜: docs/v2_specs/06_design/v2_admin_master_plan_ko.md
- **GSAP 레퍼런스**: docs/v2_specs/06_design/v2_gsap_reference_ko.md

- **V2 어드민 개발/테스트 가이드(로컬 런북)**: docs/06_ops/admin/01_v2_admin_dev_test_guide_ko_v1.0.md

- [ ] 문서 분류/링크 최신화
- [ ] SoT 우선순위 준수


## 7. 변경 이력
- v2.15 (2026-02-02, Antigravity Agent): HQ Margin CSV 임포트 500 에러 해결 (Pandas 의존성 제거 리팩토링 & Multipart Boundary 수정)
- v2.14 (2026-02-02, Antigravity Agent): 룰렛 체험 티켓(`TRIAL_TICKET`) 일일 제한 강제 및 넛지 서비스 버그 수정 (W05_GAME)
- v2.10 (2026-02-02, Antigravity Agent): 신규 유저 미션(7일/FAB 타이머) SOT 및 트러블슈팅 업데이트
- v2.11 (2026-02-02, GitHub Copilot): V2 세그먼트 키 COMMON/VIP/WHALE/AT_RISK 통일 및 learned_ 기록 추가
- v2.12 (2026-02-02, GitHub Copilot): NEW 세그먼트(가입 7일/텔레그램 인증/입금 이력 제외) 추가 및 SoT/learned_ 정합성 갱신
- v2.13 (2026-02-02, GitHub Copilot): WHALE/VIP 7일 입금 기준 상향(5,000,000/3,000,000)
- v2.9 (2026-02-01, GitHub Copilot): 트러블슈팅 README 작성/업데이트 가이드 SoT 우선순위 및 증거 기반 규칙 보강
- v2.8 (2026-01-30, GitHub Copilot): V1 Auth 가드/ Celery 헬스체크 개선 및 로컬 마이그레이션 기록
- v2.2 (2026-01-19, GitHub Copilot): V1→V2 상점 상품 변환 가이드 링크 추가
- v2.1 (2026-01-19, GitHub Copilot): 상점 상품 UI Config SoT 링크 추가
- v2.0 (2026-01-19, GitHub Copilot): Auth/User·Mission·Inventory·TeamBattle·Admin/Ops API 계약 문서 추가
- v1.9 (2026-01-19, GitHub Copilot): Golden V2 문서 경로 07_golden으로 이동
- v1.8 (2026-01-19, GitHub Copilot): Golden V2 API/DB 문서 링크 추가
- v1.7 (2026-01-19, GitHub Copilot): 세그먼트/메시지 SoT 및 DB 문서 링크 추가
- v1.6 (2026-01-19, GitHub Copilot): V2 게임 DB 문서 링크 추가
- v1.5 (2026-01-19, GitHub Copilot): 게임 API 계약 문서 링크 추가
- v1.4 (2026-01-19, GitHub Copilot): 게임 엔진 SoT 문서 링크 추가
- v1.3 (2026-01-19, GitHub Copilot): 게임 엔진 표준화 설계 문서 링크 추가
- v1.2 (2026-01-19, GitHub Copilot): V2 DB 진행 상태 업데이트 반영
- v1.1 (2026-01-19, GitHub Copilot): V2 DB 로그/ops 문서 링크 추가
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
- v2.3 (2026-01-20, GitHub Copilot): Troubleshooting 섹션 및 V2 Admin 라우터 모듈(코드 맵) 링크 추가
- v2.4 (2026-01-22, GitHub Copilot): CSV 임포트 가이드 및 신규 어드민 라우터(CSV, CC Deposit, Ops Plan) 링크 추가
- v2.5 (2026-01-27, GitHub Copilot): V2 핵심 일관성 체크아웃(Learned SoT) 최신화 및 인덱스 구조 재편성
- v2.7 (2026-01-30, GitHub Copilot): 운영 서버 검증 결과 추가 (텔레그램/인증/Redis/Circuit Breaker)
- v2.6 (2026-01-30, GitHub Copilot): 배포 트러블슈팅 이슈(이슈 5~8) 추가, 저장소 이관(jm956-cc/202601_app) 기록
