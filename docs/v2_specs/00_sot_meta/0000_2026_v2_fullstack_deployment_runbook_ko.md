# V2 풀스택 배포 런북 (V2 Full-Stack Deployment Runbook)

**문서 타입**: 배포 운영 절차서 (Operational Runbook)
**작성일**: 2026-01-29
**프로젝트**: Golden V2

---

## 🏗️ 1. 배포 전 점검 (Pre-Deployment Checklist)

배포 직전 로컬 또는 스테이징 환경에서 반드시 다음 항목을 통과해야 합니다.

- [x] **V1 코드 완전 제거**: 모든 API 라우트가 `app/v2` 네임스페이스를 참조하는지 확인.
      0129_실제 서비스 코드(app/, src/) 내 v1 네임스페이스/라우트/핸들러/임포트 등은 모두 제거되어 있고,
      legacy/v1 관련 주석/호환성 코드만 일부 남아 있습니다.
      예시: Legacy redirect, LegacyTokenType, fallback to legacy, V1-style, v1 디자인, v1/v2 공용 등
      일부 라우터/컴포넌트에서 legacy path 리다이렉트, v1 UX/디자인 유지 등 주석/설명
- [x] **KST 09:00 정합성**: 모든 Scheduler 및 Task가 `Asia/Seoul` 타임존을 따르는지 확인.
      tests/v2/test_daily_nudge_service.py에서 09:00 KST 경계, 운영일, 타임존 관련 테스트(운영일 시작, 00:00~09:00 KST  
      경계, business_day_start, today/yesterday 계산 등) 모두 포함
      총 31개 테스트 전부 통과(PASSED)
- [x] **RBAC 보안**: `SUPERADMIN` 외에는 ROI 및 CSV 임포트 접근권한이 없는지 확인. ?? 
      슈퍼어드민 개념 폐기!! 
      “SUPERADMIN” 개념은 폐기(더 이상 별도의 슈퍼어드민 등급/권한 없음)
      모든 운영/관리 권한은 “ADMIN” 등급(혹은 ADMINUserProfile의 tags 기반)으로 통합·정규화됨
      RBAC 정책은 “ADMIN” 권한 이상만 ROI, CSV 임포트 등 민감 기능 접근 가능(별도 SUPERADMIN 예외 없음)
      체크리스트/런북/문서에 남아있는 “SUPERADMIN” 언급은 과거 정책의 잔재로, 최신 learned_ 기준과 불일치
- [x] **토큰 만료 정책**: Access(15m), Refresh(30d) 정책이 환경 변수에 설정됨.
      Access(15m), Refresh(30d) 만료 정책은 실제 코드와 환경설정에 모두 구현되어 있음
- [x] **Circuit Breaker 한도(SoT) 정합성**: `CIRCUIT_LIMIT_VAULT=100000`, `CIRCUIT_LIMIT_TICKET=30` 값이 환경/코드/테스트/운영 정책에 일치하는지 확인.
---

## 🧪 2. 최소 통합 테스트 세트 (Smoke Tests)

배포 전 아래 테스트 스위트를 실행하여 핵심 비즈니스 로직의 결함을 차단합니다.

### 2.1 백엔드 핵심 (pytest)
Golden V2 배포 품질 보장을 위해 아래 모든 영역에 대해 테스트/검증이 필요합니다.

**[x]아키텍처/SoT 준수**: V1 코드 의존성 완전 제거, V2 네임스페이스 일관성
      - pytest -v tests/v2_tests/phase1_env/test_v2_architecture_sot.py
**[x]인증/권한(RBAC)**: Telegram Auth, RBAC, ADMIN 권한, 일반 유저 차단, SUPERADMIN 폐기
      - pytest -v tests/v2/test_telegram_auth.py
      - pytest -v tests/v2/test_admin_rbac.py
**[x]Golden 핵심로직**: Circuit Breaker, ROI, Rollback, Daily Nudge 등
      - pytest -v tests/v2/test_circuit_breaker.py
      - pytest -v tests/v2/test_roi_rollback_service.py
      - pytest -v tests/v2/test_daily_nudge_service.py
      - pytest -v tests/v2/test_latency_survival.py
**[x]Vault & Economy**: 금고 잔액 동기화, 출금/입금, VaultLedger, daily_vault_spent, CC Deposit 등
      - pytest -v tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py
      - pytest -v tests/v2_tests/phase2_core/test_cc_deposit_logic.py
      - pytest -v tests/v2_tests/phase2_core/test_vault_limit_suspension.py
**[x]Inventory & Shop**: 티켓/아이템 지급/차감, InventoryLog, Shop 구매/차감 등
      - pytest -v tests/v2_tests/phase2_core/test_shop_inventory_logic.py
      - pytest -v tests/v2_tests/phase4_admin/test_shop_crud.py
**[x]보상(Rewards)**: 설문/보상 지급, 보상 로그/중복 지급 방지 등
      - pytest -v tests/v2_tests/phase2_core/test_survey_reward_service_unit.py
**[x]Mission & Streak**: 09:00 KST 리셋, 미션/스트릭 경계, 마일스톤 등
      - pytest -v tests/v2_tests/phase2_core/test_v2_mission_service.py
      - pytest -v tests/v2_tests/phase2_core/test_v2_mission_edge_cases.py
      - pytest -v tests/test_streak_midnight_boundary.py
**[x]Level & XP**: user_level_progress, XP 이벤트 로그, 레벨 보상표, Season Pass 폐기 등
      - pytest -v tests/v2_tests/phase2_core/test_xp_cap.py
      - pytest -v tests/test_enum_matches_sot.py (XP 및 레벨 Enum 정합성)
**[x]Team Battle**: 시즌/팀 CRUD, 점수 조정, 멤버 관리, Admin API, FE 연동 등
      tests/v2_tests/phase2_core/test_team_battle_admin_service_unit.py
      tests/v2_tests/phase2_core/test_team_battle_edge.py
      tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py
**[x]게임(Game)**: 게임 엔진 스모크, 게임 원장 분리, 어드민 주사위 연동 등
      - pytest -v tests/v2_tests/phase3_game/test_game_engine_smoke.py
      - pytest -v tests/v2_tests/phase3_game/test_game_ledger_separation.py
      - pytest -v tests/v2_tests/phase3_game/test_dice_admin_integration.py
**[x]Admin Dashboard**: 09:00 KST 리셋 통일, KPI 집계, Audit Log, 티켓/인벤토리 로그 KST 변환 등
      tests/v2_tests/phase4_admin/test_admin_ops_routes_coverage.py
      tests/v2_tests/phase4_admin/verify_admin_ops_v2.py
      tests/v2/test_admin_api.py
**[x]Golden Intervention**: Circuit Breaker, Daily Nudge, Latency Survival, ROI Calculator, Rollback Policy 등
      tests/v2_tests/phase2_core/test_golden_intervention_service.py
      tests/v2_tests/phase2_core/test_retention_intervention_service_unit.py
      tests/v2_tests/phase5_public/test_golden_v2_integrated.py
**[x]DB & Migration**: Alembic 마이그레이션, 필수 테이블/인덱스, DB 백업/복원 등
      tests/v2_tests/phase1_env/test_environment_sanity.py (DB 구성 무결성)
**[x]환경 변수/설정**: .env 값, JWT/Telegram/Redis/Sentry 등 필수 환경 변수, 보안 검증
      tests/v2_tests/phase1_env/test_environment_sanity.py
      tests/v2_tests/phase2_core/test_v2_imports_smoke.py

**[]보안/품질**: Rate Limit, SQL Injection/XSS, CORS, DEV_LOGIN_ENABLED, TEST_MODE, JWT_SECRET 등
      tests/v2_tests/phase4_admin/test_admin_ops_security.py
      tests/v2/test_admin_rbac.py
      tests/v2_tests/phase4_admin/test_api_coverage.py

**테스트 커버리지**: pytest 전체, 커버리지 80% 이상, Enum 정합성, E2E 테스트 등

tests/test_enum_matches_sot.py  (Enum 정합성)
tests/v2_tests/phase4_admin/test_api_coverage.py (API 커버리지)
tests/v2_tests/phase5_public/verify_full_scenario_v2.py (전체 E2E 시나리오)

✅ auth.py에서 UserEventLog 삽입 로직을 V2EventLog로 변경 (장기 해결)

### 2.2 프론트엔드 연동 (E2E)
- [x] `GET /admin/ops/status`: 시스템 및 Redis 상태 OK 확인.
- [x] `POST /admin/csv-import/validate`: 표준 로그 CSV 검증 통과 확인.

---

## 📢 3. 배포 통보 및 모니터링

1. **로그 수준**: 배포 초기 24시간 동안은 `LOG_LEVEL=INFO` 유지 권장.
2. **Sentry**: 배포 직후 새로운 Issue가 발생하는지 실시간 모니터링.
3. **Redis Stream**: `golden:v2:events:game` 채널로 실시간 로그가 흐르는지 확인.
   ```bash
   redis-cli monitor | grep "golden:v2:events"
   ```
4. **Circuit Breaker 한도(SoT)**: `CIRCUIT_LIMIT_VAULT=100000`, `CIRCUIT_LIMIT_TICKET=30` 값이 적용되어 있는지 확인.

---

## 🚨 4. 롤백 판단 기준 (Rollback Criteria)

다음 상황 발생 시 즉시 `git checkout <tags>` 및 컨테이너 롤백을 실행합니다.

1. **로그인 불가**: Telegram Auth 또는 Refresh Token 갱신 실패로 유저 진입이 차단될 때.
2. **자산 사고**: 서킷 브레이커(Circuit Breaker)가 발동하지 않고 비정상적인 재화가 지급될 때.
3. **데이터 유실**: DB Migration 실패로 인해 신규 필드에 데이터가 쌓이지 않을 때.
4. **운영일 장애**: 09:00 KST에 미션/스트릭 리셋이 발생하지 않을 때.

---

## 📡 5. 배포 후 정밀 확인 (Post-Deployment Validation)

### 👤 5.1 유저 경험 검증 (User Experience - UX)
유저가 실제 게임 서비스를 이용하는 데 문제가 없는지 직접 테스트합니다.
1. **텔레그램 연동**: 봇 메뉴를 통해 웹앱 진입 시 닉네임과 `cc_id`가 상단에 올바르게 노출되는가?
2. **자산 동기화**: 메인 지갑 잔액이 `locked_balance`와 일치하며, 0.1초 이내로 업데이트되는가?
3. **미션 시작**: 첫 접속 시 '데일리 출석' 미션이 자동으로 시작(In-progress)되는가?

### 🛡️ 5.2 어드민 운영 검증 (Admin Governance - Ops)
운영자가 시스템을 통제하고 지표를 확인하는 데 결함이 없는지 테스트합니다.
1. **RBAC 필터링**: `STAFF` 계정으로 로그인 시 `Circuit Breaker` 설정 페이지 접근이 차단되는가?
2. **ROI 실시간 집계**: 최근 1시간 이내의 로그 데이터가 ROI 대시보드 그래프에 반영되는가?
3. **지급 도구(Admin Tool)**: 유저에게 수동으로 티켓 1장을 지급했을 때, `Intervention Log`에 기록되고 유저 인벤토리에 즉시 반영되는가?
4. **CSV 분석 엔진**: 외부 로그 CSV를 업로드했을 때, 베팅액 집계(GGR)가 소수점 단위 오차 없이 계산되는가?

---
## ✅ 6. 점검 결과 (2026-01-30)

### 6.1 환경/인프라
- Docker Compose 상태: backend/frontend/nginx/db/redis 모두 Healthy
- Redis: `PONG` 확인
- Alembic: `96be4ed554ee (head)` 확인
- ENV: `DEV_LOGIN_ENABLED=false`, `TEST_MODE=false`, `TIMEZONE=Asia/Seoul`, `CIRCUIT_LIMIT_VAULT=100000`, `CIRCUIT_LIMIT_TICKET=30` 확인
- JWT/Telegram 시크릿: 값 존재 확인(문서에는 노출하지 않음)
- 헬스 체크: `/health`, `/api/v2/health/db` → 404 (Not Found)

### 6.2 테스트 실행 결과
- `pytest tests/v2/ -v` → **313 passed**
- `pytest tests/v2_tests/ -v` → **208 passed, 4 failed, 3 skipped**
      - 실패:
            - `tests/v2_tests/phase4_admin/test_admin_analytics_baseline.py::test_vault2_stats_aggregation` (SQLite NOT NULL: `vault_earn_event.earn_event_id`)
            - `tests/v2_tests/phase5_public/test_public_routes_smoke_extended.py::test_v2_public_routes_smoke_extended` (401 AUTH_REQUIRED)
            - `tests/v2_tests/phase5_public/test_verify_full_scenario_v2.py::test_verify_full_scenario_v2` (401 AUTH_REQUIRED)
            - `tests/v2_tests/phase5_public/test_verify_full_scenario_v2.py::test_full_scenario_v2` (401 AUTH_REQUIRED)
- `pytest tests/test_streak_midnight_boundary.py -v` → **15 passed**
- `pytest tests/test_enum_matches_sot.py -v` → **6 passed, 1 error**
      - 에러: teardown 시 `season_pass_reward_log` 테이블 누락

---
**최종 업데이트**: 2026-01-30
**승인**: CTO / Product Owner

## 7. 변경 이력
- 2026-01-30: 체크리스트 기반 점검 결과 추가
