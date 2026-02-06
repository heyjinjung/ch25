문서 타입: SoT
버전: v2.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/운영/QA
상태: SoT

# V2 Ops SoT 통합 문서 (6개 영역)

## 1. 목적 (Purpose)
V2 운영(System/Ops) 전반의 기준을 6개 영역으로 통합하고, 우선 적용 규칙과 검증 체크리스트를 제공한다.

## 2. 범위 (Scope)
- 배포/인프라/환경
- 운영 모니터링/알림/가시성
- 데이터/마이그레이션/백업/복구
- 어드민/정책/권한/감사
- 게임/경제/골든/CRM 운영
- 트러블슈팅/검증/런북

## 3. 공통 운영 원칙 (Global Rules)
1) SoT 경로는 docs/SOT/ops 만 사용한다.
2) 모든 비즈니스 날짜 계산은 Asia/Seoul(KST) 기준, 오전 9시 리셋을 준수한다.
3) 운영 장애 분석은 증상 정의(대상 기능/HTTP Status/영향 범위/재현 빈도)와 로그/DB 제약조건 증거 기반으로 작성한다.
4) Admin API는 /api/v2/admin 하위로만 노출하며, 프론트 호출 경로와 1:1 동일해야 한다.
5) Admin 변경성 작업은 V2AdminAuditService.log 표준 시그니처로 감사 로그를 남긴다.
6) Enum/상수/DB 제약조건은 코드-DB-프론트-문서 1:1 정합성을 유지한다.

## 4. 영역 1: 배포/인프라/환경

### 4.1 배포 자동화 필수 단계
1) Docker 이미지 빌드
2) 컨테이너 기동
3) Alembic 마이그레이션 적용
4) 헬스 체크(backend 직결 + nginx 경유)
5) 스모크 검증(핵심 API 라우트)

### 4.2 헬스 체크 기준
- backend 컨테이너 내부 GET /api/health 200
- nginx 경유 GET /health 200
- nginx 경유 GET /api/v2/health/db 200

### 4.3 배포 실패 시 롤백
1) 이전 안정 버전으로 코드 롤백
2) 컨테이너 재기동
3) 필요 시 Alembic downgrade
4) 캐시 초기화
5) 헬스 체크 재검증

### 4.4 운영 환경 변수
- SENTRY_DSN은 GitHub Secrets 또는 운영 .env에만 보관
- 운영 환경에서 /api/v2/metrics는 인프라 레벨 접근 통제

### 4.5 상세 링크 (ops 문서)
- [v2_deployment_automation_script_ko.md](./v2_deployment_automation_script_ko.md)
- [v2_deployment_docker_compose_guide_ko.md](./v2_deployment_docker_compose_guide_ko.md)
- [v2_deployment_rollback_script_ko.md](./v2_deployment_rollback_script_ko.md)
- [20260130_deployment_verification_report.md](./20260130_deployment_verification_report.md)
- [20260204_production_backup_and_cleanup_report.md](./20260204_production_backup_and_cleanup_report.md)

### 4.6 구현 증거 (코드베이스)
- docker-compose.yml
- Dockerfile.backend
- Dockerfile.frontend
- alembic/

## 5. 영역 2: 운영/모니터링/알림

### 5.1 시스템 공통 API
- GET /api/v2/health -> {"status":"ok"}
- GET /api/v2/health/db -> {"status":"ok"}
- GET /api/v2/today-feature -> feature_type, (인증 시) user_id 포함
- GET /api/v2/metrics -> Prometheus 포맷

### 5.2 Sentry 설정 기준
- traces_sampler 기반 샘플링 (API 경로 100% 추적)
- WARNING 이상 이벤트 전송
- enable_tracing, max_breadcrumbs, attach_stacktrace 활성화
- 배포 후 Transactions/Issues/Performance 탭에서 정상 수집 확인

### 5.3 운영 대시보드 지표
- /api/v2/admin/ops/status 정상 응답
- Ops Dashboard에 HQ 마진 통계 카드 노출
- ROI 분석: V2RetentionRoiLog 기반 캠페인 성과 집계

### 5.4 상세 링크 (ops 문서)
- [v2_system_api_contract_ko.md](./v2_system_api_contract_ko.md)
- [v2_admin_ops_api_contract_ko.md](./v2_admin_ops_api_contract_ko.md)
- [v2_api_integration_guide_ko.md](./v2_api_integration_guide_ko.md)
- [2026_01_31_sentry_config_update.md](./2026_01_31_sentry_config_update.md)
- [sentry_setup_guide_ko.md](./sentry_setup_guide_ko.md)
- [11.roi_analysis.md](./11.roi_analysis.md)

### 5.5 구현 증거 (코드베이스)
- app/main.py (Sentry init, health 라우트)
- app/v2/api/routes.py (System 라우팅)
- app/v2/api/admin/ops_routes.py (ops/status)
- src/v2/admin/pages/dashboard/OpsDashboard.tsx (HQ 마진 카드)

## 6. 영역 3: 데이터/마이그레이션/백업/복구

### 6.1 마이그레이션 원칙
- alembic head 적용 여부를 항상 확인한다.
- SQLAlchemy 2.0에서 db.execute는 text() 사용을 준수한다.

### 6.2 HQ Import 운영 정책
- HQ_MARGIN: 세그먼트 전용 (VIP/WHALE/AT_RISK/COMMON)
- HQ_DAILY: 일별 입금 반영 (중복 방지용 dedup_key 필수)
- 붙여넣기 Import: DAILY_DEPOSIT, GAME_LOG 지원 (DB 최신 시간 이후만 처리)

### 6.3 지출 원장
- v2_spending_ledger 기록을 기준으로 순수익 계산
- HQ 환전 붙여넣기 Import는 지출 원장에 기록된다.
- VAULT 비용은 POINT로 매핑한다.

### 6.4 백업/초기화
- 운영 DB 백업은 mysqldump --no-tablespaces 사용
- 대량 정리 전 docker system/image/builder prune로 공간 확보
- 운영 데이터 초기화는 scripts/production_data_reset.sql 기준으로 수행

### 6.5 상세 링크 (ops 문서)
- [12.hq_margin_csv_import_comprehensive.md](./12.hq_margin_csv_import_comprehensive.md)
- [20260131_hq_margin_csv_import_phase2_4_detailed_implementation.md](./20260131_hq_margin_csv_import_phase2_4_detailed_implementation.md)
- [20260204_hq_import_redesign_and_git_secret_fix.md](./20260204_hq_import_redesign_and_git_secret_fix.md)
- [20260205_spending_ledger_withdrawal_import_impl.md](./20260205_spending_ledger_withdrawal_import_impl.md)
- [20260203_production_data_reset_report.md](./20260203_production_data_reset_report.md)

### 6.6 구현 증거 (코드베이스)
- app/v2/services/hq_margin_import_service.py
- app/v2/services/hq_daily_deposit_import_service.py
- app/v2/services/paste_import_service.py
- app/v2/services/spending_logger_service.py
- app/v2/models/v2_spending_ledger.py
- app/v2/models/v2_hq_daily_withdrawal_log.py
- alembic/versions/20260205_0100_add_v2_spending_ledger.py
- alembic/versions/20260205_0200_add_v2_hq_daily_withdrawal_log.py
- scripts/production_data_reset.sql

## 7. 영역 4: 어드민·정책·권한·감사

### 7.1 감사 로그 표준
- 표준 호출: V2AdminAuditService.log(db, admin_id, action, target_type, target_id, payload_json)
- 모든 변경성 작업(POST/PATCH/PUT/DELETE) 및 비동기 작업 시작/완료 기록

### 7.2 라우팅 prefix 규칙
- Admin API는 반드시 /api/v2/admin 하위
- 프론트 호출 경로와 백엔드 라우터 path 문자열 1:1 동일

### 7.3 Admin 기능 운영 요약
- 팀배틀 어드민: 시즌/팀/점수/멤버 강제 관리
- 닉네임 조회: resolveAdminUserIdentifier로 닉네임/ID 혼용 지원
- 복권 경품 수정: 부분 업데이트 지원(필드 Optional)
- 인박스/메시지/세그먼트 배치 API 계약 준수

### 7.4 Admin 테스트/검증
- Full-Stack Admin 통합 테스트 로그 기준 통과
- /api/v2/admin/ops/status, /api/v2/admin/dashboard/metrics 실호출 정상

### 7.5 상세 링크 (ops 문서)
- [01.adminguide.md](./01.adminguide.md)
- [20260206_admin_audit_and_routing_rules.md](./20260206_admin_audit_and_routing_rules.md)
- [v2_admin_ops_api_contract_ko.md](./v2_admin_ops_api_contract_ko.md)
- [v2_ops_execution_api_contract_ko.md](./v2_ops_execution_api_contract_ko.md)
- [v2_fullstack_integration_test_logs_admin_20260124.md](./v2_fullstack_integration_test_logs_admin_20260124.md)
- [20260126_team_battle_nickname_lookup_update.md](./20260126_team_battle_nickname_lookup_update.md)
- [20260127_lottery_prize_partial_update_fix.md](./20260127_lottery_prize_partial_update_fix.md)

### 7.6 구현 증거 (코드베이스)
- app/v2/middleware/admin_audit.py
- app/v2/api/admin/__init__.py
- app/v2/api/admin/team_battle_routes.py
- app/v2/api/admin/game_config_routes.py
- app/v2/schemas/v2_admin_game.py
- app/v2/api/admin/user_routes.py
- src/v2/api/adminApi.ts
- src/v2/admin/pages/game/AdminTeamBattlePage.tsx

## 8. 영역 5: 게임·경제·골든·CRM 운영

### 8.1 게임/경제 핵심 정책
- GameTokenType 표준 명칭 사용 (ROULETTE_TICKET, DICE_TICKET, LOTTERY_TICKET 등)
- 보상 저장소 분리: TICKET/DIAMOND -> Game Wallet, GIFTICON -> Inventory, VAULT -> vault_locked_balance
- 룰렛 세그먼트는 8칸(0~7) 제약조건을 유지한다.

### 8.2 골든 V2 운영
- Circuit Breaker는 지급 경로에서 반드시 동작해야 한다.
- Ops Plan 액션: INVENTORY_GRANT_ALL, TARGETED_ITEM_GRANT, GOLDEN_HOUR, TARGETLIST_BROADCAST, MESSAGE_TEMPLATE
- Ops 실행 결과는 v2_ops_execution_result 또는 payload_json["execution_result"]에 저장
- Redis 키/채널 표준: golden:v2:* 네이밍 준수

### 8.3 CRM/마케팅 운영
- ROI 분석은 Retention ROI 기준(보상 비용 대비 예측 LTV)
- 마케팅/심리 모델은 윤리 가드레일 준수, 다크 패턴 금지
- VVIP/High/Mid/Winner 세그먼트 운영은 통합 마케팅 SoT 기준 준수

### 8.4 퍼즐 컬렉션 교환
- PUZZLE_C1/C2/J/M 1개씩 소비 -> GOLD_KEY_TICKET 1개 지급
- 교환 기록은 user_game_wallet_ledger에 남긴다.

### 8.5 상세 링크 (ops 문서)
- [03.game.md](./03.game.md)
- [04.team_battle.md](./04.team_battle.md)
- [2026_01_28_golden_v2_ops_plan_expansion_spec.md](./2026_01_28_golden_v2_ops_plan_expansion_spec.md)
- [2026_01_29_golden_v2_daily_nudge_impl_plan_ko.md](./2026_01_29_golden_v2_daily_nudge_impl_plan_ko.md)
- [2026_01_29_golden_v2_remaining_implementation_guide_ko.md](./2026_01_29_golden_v2_remaining_implementation_guide_ko.md)
- [v2_ops_plan_execution_schema_sot_ko.md](./v2_ops_plan_execution_schema_sot_ko.md)
- [v2_redis_keys_channels_sot_ko.md](./v2_redis_keys_channels_sot_ko.md)
- [20260131_puzzle_collection_gold_key_craft.md](./20260131_puzzle_collection_gold_key_craft.md)
- [20260127_lottery_ui_backend_tier_sync.md](./20260127_lottery_ui_backend_tier_sync.md)
- [v2_integrated_marketing_ops_sot.md](./v2_integrated_marketing_ops_sot.md)

### 8.6 구현 증거 (코드베이스)
- app/v2/services/circuit_breaker_service.py
- app/v2/services/vault2_service.py
- app/v2/services/daily_nudge_service.py
- app/v2/tasks/daily_nudge_tasks.py
- app/v2/services/v2_lottery_game_service.py
- app/v2/services/v2_exchange_service.py
- app/v2/api/exchange_routes.py
- app/v2/api/team_battle_routes.py

## 9. 영역 6: 트러블슈팅·검증·런북

### 9.1 증상 정의 포맷
- 대상 기능, HTTP Status, 영향 범위, 재현 빈도

### 9.2 대표 이슈 패턴
- Admin 라우팅 prefix 불일치 -> 404
- Pydantic 필수 필드 불일치 -> 400 (부분 업데이트 필요)
- DB 테이블 누락 -> ProgrammingError

### 9.3 배포 검증 체크리스트
- 컨테이너 healthy 상태 확인
- /health, /api/v2/health, /api/v2/health/db 응답 확인
- 주요 Admin API 실호출 확인

### 9.4 상세 링크 (ops 문서)
- [0000_2026_v2_deployment_troubleshooting_guide_ko.md](./0000_2026_v2_deployment_troubleshooting_guide_ko.md)
- [20260204_frontend_build_fix_and_docker_cleanup.md](./20260204_frontend_build_fix_and_docker_cleanup.md)
- [20260204_legacy_code_cleanup_report.md](./20260204_legacy_code_cleanup_report.md)
- [20260204_reward_service_refactor_and_test_reset.md](./20260204_reward_service_refactor_and_test_reset.md)
- [20260130_deployment_verification_report.md](./20260130_deployment_verification_report.md)

## 10. 부록: 핵심 API/스키마 요약

### 10.1 System API 요약
- GET /api/v2/health
- GET /api/v2/health/db
- GET /api/v2/today-feature
- GET /api/v2/metrics

### 10.2 Ops 실행 결과 스키마 요약
- kind, timestamp, worker_id, execution_error, items, target, granted_users, async_task_id

### 10.3 Redis 키/채널 요약
- keys: golden:v2:user:{id}:loss_streak, golden:v2:user:{id}:session_start_balance, golden:v2:user:{id}:psych_state, golden:v2:ops:result:{task_id}
- channels: golden:v2:events:game, golden:v2:events:intervention, golden:v2:feed:public, golden:v2:ops:ws

## 11. 변경 이력
- v2.1 (2026-02-07, GitHub Copilot): 6개 영역별 상세 링크 및 구현 증거 추가
- v2.0 (2026-02-07, GitHub Copilot): ops 문서 6개 영역 통합, 운영 공통 규칙/체크리스트 정리
- v1.1 (2026-01-30, GitHub Copilot): /api/v2/health/db 헬스 체크 추가
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
