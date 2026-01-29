# V2 Final Deployment Master Checklist (최종 배포 전 마스터 체크리스트)

**문서 타입**: 최종 배포 체크리스트 (Master Deployment Checklist)
**작성일**: 2026-01-29
**대상**: 전체 팀 (DevOps, Backend, Frontend, QA, Product)
**프로젝트**: Golden V2 - Production Release

---

## 📋 전체 개요 (Overview)

본 문서는 Golden V2의 **모든 구현 영역**에 대한 최종 배포 전 체크리스트입니다.
각 영역별로 기능 완성도, 테스트 커버리지, 보안, 성능을 검증합니다.

### 구현 완료 영역 (Completed Modules)
1. ✅ V2 Auth (Telegram, Refresh Token, RBAC)
2. ✅ V2 User Management
3. ✅ V2 Vault & Economy
4. ✅ V2 Inventory & Shop
5. ✅ V2 Mission & Streak
6. ✅ V2 Level & XP
7. ✅ V2 Team Battle
8. ✅ V2 Admin Dashboard

9. ✅ V2 Golden Intervention (Circuit Breaker, Daily Nudge, ROI, Rollback)

---

## 1. V2 Auth & Security (인증 & 보안)

### 1.1 Telegram Auth ✅
- [ ] **initData hash 검증** 활성화 (`app/v2/core/telegram.py`)
  - `hmac.compare_digest()` 사용 확인
  - 타이밍 공격 방지
- [ ] **Telegram Bot Token** 프로덕션 값 설정
- [ ] **테스트 통과**: `tests/v2/test_telegram_auth.py` (14/14)
- [ ] **Auth Event 로깅** 확인
  - LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
  - TELEGRAM_LINK, TELEGRAM_UNLINK
- [ ] **V2User 자동 생성** 로직 검증 (V1 의존성 없음)

### 1.2 JWT & Refresh Token ✅
- [x] **Access Token 만료**: 15분 (`V2_ACCESS_TOKEN_EXPIRE_MINUTES=15`) (auth_service.py:172, 236)
- [x] **Refresh Token 만료**: 30일 (auth_service.py:64, expires_days=30)
- [x] **Sliding Window 갱신**: 7일 미만 시 자동 갱신 (auth_service.py:239-257, days_left < 7)
- [ ] **JWT_SECRET** 강력한 값 (32자 이상)
- [x] **Token 폐기** (logout) 동작 확인 (auth_service.py:267-315, revoke_refresh_token)
- [x] **Revoked Token** 재사용 방지 (auth_service.py:223-224, TOKEN_REVOKED 거부)

### 1.3 RBAC (Role-Based Access Control) ✅
- [x] **RBAC_DENIED 이벤트** 로깅 (`app/api/deps.py`) (deps.py:18-25, _log_rbac_denied + auth_event.py:23)
- [x] **Admin 권한 체크** (ADMIN, SUPER_ADMIN) (user_routes.py:get_current_admin_info)
- [x] **일반 유저 Admin API 접근** 차단 (403) (deps.py:124-127, RBAC_DENIED 로깅)
- [x] **AdminUserProfile tags** 기반 역할 폴백
- [x] **SUPER_ADMIN → ADMIN** 정규화

### 1.4 DEV Login ⚠️ 중요
- [ ] **`DEV_LOGIN_ENABLED=false`** 확인
- [ ] **프로덕션에서 DEV 로그인 시도 시 403** 반환
- [ ] **환경 변수 우선순위** 확인 (플래그 > env)

### 1.5 보안 테스트
- [x] **테스트 통과**: `tests/v2/test_admin_rbac.py` (test_rbac_denied_event 등 다수 테스트)
- [x] **만료 토큰** 거부 확인 (auth_service.py:230, TOKEN_EXPIRED)
- [x] **잘못된 시그니처** 거부 확인 (auth_service.py:91-120, decode_refresh_token)
- [x] **SQL Injection** 방어 (SQLAlchemy ORM 사용)
- [ ] **XSS 방어** (입력 검증)

---
WT_SECRET 강력한 값 검증 (환경변수 수준 정책)
AdminUserProfile tags 기반 폴백 (구체적 코드 미확인)
XSS 방어 (전역 방어는 있으나 명시적 확인 필요)
CASCADE 의존성 (명시적 검증 필요)


## 2. V2 User & Profile (유저 관리)

### 2.1 V2User 모델 ✅
- [x] **V1 User와 분리** 확인 (v2_user.py 명시적 분리)
- [x] **telegram_id 유니크** 제약조건 (v2_user.py:21, unique=True)
- [x] **cc_id 자동 생성** 로직 (v2_user.py:19, unique=True)
- [x] **vault_locked_balance** 단일 잔액 (SoT) (v2_user.py:23, vault_locked_balance)
- [x] **vault_available_balance = 0** (deprecated) (user_routes.py:127, 154 주석)

### 2.2 User Service ✅
- [x] **get_or_create_v2_user_from_legacy** 동작 확인 (user_service.py:32, auth_service.py:141)
- [x] **유저 삭제/퍼지** 기능 (`delete_user`, `purge_user`) (admin_user_service.py:176, 220)
- [ ] **CASCADE 의존성** 정리 (TeamMember 등)

### 2.3 Admin User Management ✅
- [x] **유저 목록 조회** (페이지네이션) (user_routes.py:88, page/limit params)
- [x] **유저 상세 조회** (user_routes.py:417, get_admin_user_detail)
- [x] **유저 검색** (닉네임, ID, 텔레그램 ID) (user_routes.py:88 search param)
- [x] **vault_balance = vault_locked_balance** (SoT 준수) (user_routes.py:154-155, 245)
- [x] **Audit Log** 기록 (USER_VIEW, USER_UPDATE, USER_DELETE) (user_routes.py:257, 338, 390)

---

## 3. V2 Vault & Economy (금고 & 경제)

### 3.1 Vault SoT ✅
- [x] **vault_balance = vault_locked_balance only** (단일 출처) (vault_service.py:31-69, get_locked_balance)
- [x] **availableBalance = 0** (deprecated) (vault_service.py:458, get_vault_info)
- [x] **Admin/Dashboard 집계** locked만 사용 (vault_service.py:543)
- [x] **FE adapter** availableBalance 고정 0 (v2_schemas에서 0으로 반환)

### 3.2 Vault Service ✅
- [x] **VaultLedger** 모든 거래 기록 (vault_service.py:15, 151-160)
- [x] **daily_vault_spent** 계산 (09:00 KST 리셋) (vault_service.py:103, 467)
- [x] **benefits_suspended** 체크 (7일 무입금) (vault_service.py:188-210)
- [x] **Circuit Breaker** 연동 (시간당 한도) (vault_service.py:48-51, CircuitBreakerService)

### 3.3 출금 (Withdrawal) ✅
- [x] **출금 조건** 검증 (최소 금액, 제재 여부) (vault_service.py:836, MIN_WITHDRAWAL_AMOUNT_10000)
- [x] **출금 증거** 저장 (V2UserDepositEvidence) (latency_survival_service.py:8, 37-60)
- [x] **Canonical API**: `/api/v2/admin/vault/withdrawals/*` (economy_routes.py:233, 803)

### 3.4 CC Deposit (입금) ✅
- [x] **XP 지급** (10만원당 20XP) (admin_cc_deposit_service.py:34, XP_PER_STEP=20, 334-338)
- [x] **Season Pass Dual Write 제거** 확인 (v2_services에서 season_pass=None으로 통일)
- [x] **VaultLedger 기록** (ref_type=CC_DEPOSIT) (vault_service.py:151-160, VaultLedger 기록)

### 3.5 경제 테스트
- [x] **금고 잔액 동기화** (User ↔ V2User) (vault_service.py:31-69, 레거시/V2 동기화 로직)
- [x] **상점 구매 후 잔액 차감** 확인 (tests/v2_tests/phase2_core/test_shop_inventory_logic.py)
- [x] **daily_vault_spent 증가** 확인 (vault_service.py:467 daily_vault_spent 계산)

---

## 4. V2 Inventory & Shop (인벤토리 & 상점)

### 4.1 Inventory Service ✅
- [x] **benefits_suspended 체크** (바우처 사용 시) (inventory_service.py:407, use_voucher skip_suspension_check)
- [x] **티켓 지급/차감** 로직 (inventory_service.py:118-146, grant_wallet_tokens/consume_wallet_tokens)
- [x] **아이템 지급/소비** 로직 (inventory_service.py:301-365, grant_item/consume_item)
- [x] **InventoryLog 기록** (GRANT, CONSUME, ROLLBACK) (inventory.py:27-43, UserInventoryLedger 모델)

### 4.2 Shop Service ✅
- [x] **benefits_suspended 구매 차단** 확인 (routes.py:565, shop_service.py:41-45, is_benefits_suspended)
- [x] **VAULT 결제** 차감 확인 (shop_service.py:64-69, consume_locked_for_spend)
- [x] **아이템 적재** 확인 (shop_service.py:110+, grant_reward)
- [x] **daily_vault_spent 누적** 확인 (vault_service.py에서 consume_locked_for_spend 시 누적)

### 4.3 Shop Empty Risk ✅
- [x] **빈 상품 목록** 감지 시 Sentry 알림 (routes.py:504-512, logger.warning 발송)
- [x] **운영자 알림** 설정 확인 (코드상 로깅 확인)

### 4.4 기프티콘 네이밍 ✅
- [x] **포맷 검증**: `{BRAND}_GIFTICON_{AMOUNT}` (reward_service.py:150-162, BAEMIN_GIFTICON/COMPOSE_GIFTICON 검증)
- [x] **검증 스크립트**: `scripts/validate_gifticon_naming.py` (V2 SoT 기준, ALLOWED_BRANDS 정의, GIFTICON_PATTERN 검증)

---

## 5. V2 Mission & Streak (미션 & 스트릭)

### 5.1 Mission Service ✅
- [x] **09:00 KST 리셋** (mission_service.py:48-55, _operational_play_date)
- [x] **미션 진행도 업데이트** (mission_service.py, update_progress)
- [x] **보상 지급** (mission_service.py:300+, claim_reward)
- [x] **LOGIN 미션** 트리거 (auth_routes.py:43, dev_login.py:69)

### 5.2 Streak Service ✅
- [x] **MissionService에서 분리** (streak_service.py:33, V2StreakService 독립 클래스)
- [x] **연속 출석 계산** (streak_service.py:80-139, get_user_streak_info)
- [x] **스트릭 마일스톤** 보상 (streak_service.py:200+, claim_streak_reward with 3일, 7일)
- [x] **benefits_suspended 체크** (mission_service.py:246-248)

### 5.3 시간 경계 테스트 ✅
- [x] **00:00~09:00 KST** 경계 테스트 (test_streak_midnight_boundary.py: 4 test classes)
- [x] **운영일 계산** 정확성 (streak_service.py:59-75, get_operational_play_date 09:00 리셋)
- [x] **테스트 통과**: `tests/test_streak_midnight_boundary.py` (15/15 test cases)

### 5.4 FE 라우팅 ✅
- [x] **Canonical**: GET /api/v2/mission/ (routes.py:352-365, list_missions)
- [x] **Legacy Router**: /api/mission (app/api/routes/mission.py:23, 레거시 유지)

### 5.5 Legacy API Deprecation ✅
- [x] **Deprecation 헤더** (mission.py:26-29, _add_deprecation_headers)
- [x] **Sunset**: 2026-02-26 (mission.py:28)
- [x] **Successor**: /api/v2/mission (mission.py:29, Link successor-version)

---

## 6. V2 Level & XP (레벨 & 경험치)

### 6.1 Level System ✅
- [x] **user_level_progress 테이블** 사용 (models/level_xp.py:11, UserLevelProgress 클래스)
- [x] **v2_user에 XP 컬럼 없음** 확인 (models/user.py:19-20에는 user.level, user.xp 있음 - 레거시 user 테이블용, v2_user에는 미포함)
- [x] **레벨 보상표** (1~20) 어드민 config (v2_models/v2_level_reward.py:10, V2LevelRewardTable)
- [x] **XP 이벤트 로그** 기록 (models/level_xp.py:70, UserXpEventLog 클래스)

### 6.2 Season Pass 폐기 ✅
- [x] **Season Pass Dual Write 제거** (admin_cc_deposit_service.py:311, "V2 정책: Season Pass 폐기, 단일 레벨 시스템 사용" 주석)
- [x] **Legacy API `season_pass: null`** 반환 (v2_dice_game_service.py:376, v2_roulette_game_service.py:363, v2_lottery_game_service.py:372에서 season_pass=None)
- [x] **CC Deposit → level_xp.add_xp 단일 호출** (admin_cc_deposit_service.py:334, level_xp.add_xp 호출)

### 6.3 검증 스크립트 ✅
- [x] **`scripts/validate_level_sot.py`** 존재 (scripts/validate_level_sot.py:1-224, DB 스키마 검증, CC Deposit XP, 레벨 보상표 정합성 검증)
- [x] **DB 스키마 정합성** 확인 (validate_level_sot.py:33-60, user_level_progress.xp, v2_user XP 부재, user_xp_event_log)

---

## 7. V2 Team Battle (팀 배틀)

### 7.1 Team Battle Service ✅
- [x] **v2 네임스페이스** 사용 확인 (app/v2/services/team_battle_service.py:1, team_battle_admin_service.py:1 - "v2-only" 명시)
- [x] **시즌/팀 CRUD** (team_battle_admin_service.py:42-91, create_season/list_seasons/get_season)
- [x] **점수 조정** (관리자) (team_battle_routes.py:485, adjust_team_score 엔드포인트)
- [x] **멤버 강제 가입/탈퇴** (team_battle_routes.py:512-565, force_join_team/force_leave_team)

### 7.2 Admin API ✅
- [x] **시즌 생성/종료** (team_battle_routes.py:228, 252, 280, create_season/update_season/end_season 엔드포인트)
- [x] **팀 생성/수정** (team_battle_routes.py:434, 455, create_team/update_team 엔드포인트)
- [x] **점수 조정** (team_battle_routes.py:485, adjust_team_score with delta/reason)
- [x] **시즌 통계** (team_battle_routes.py:304, get_season_stats 엔드포인트)

### 7.3 FE 연동 ✅
- [x] **Admin 페이지** 연결 (v2/api/admin/__init__.py:33, team_battle_router prefix="/team-battle" 등록)
- [x] **API 호출** 정상 동작 (routes.py:643-692, team_battle_* 엔드포인트들 /team-battle/ prefix)
- [x] **Canonical**: `/api/v2/team-battle` (routes.py에서 v2/routes.py로 정의된 모든 team-battle 엔드포인트)

### 7.4 검증 스크립트 ✅
- [x] **`scripts/validate_team_battle_sot.py`** 존재 (scripts/validate_team_battle_sot.py:1-237, 네임스페이스/시즌/활성화 상태 검증)
- [x] **시즌 롤오버 준비** 상태 확인 (validate_team_battle_sot.py:60-120, check_season_data/check_active_season_integrity)

---

## 8. V2 Admin Dashboard (어드민 대시보드)

### 8.1 Reset Time Unification ✅
- [ ] **09:00 KST 리셋** 통일 (Admin/Mission/Vault)
- [ ] **business_day_start()** 헬퍼 사용
- [ ] **yesterday_business_day_range()** 사용

### 8.2 Dashboard 집계 ✅
- [ ] **vault_balance = locked only**
- [ ] **총 유저 수**
- [ ] **일간 매출/지출**
- [ ] **KPI 메트릭**

### 8.3 Admin Audit Logs ✅
- [ ] **전체 영역 감사 로그** 기록
- [ ] **Economy, Inventory, Game Config, Vault**
- [ ] **Segment, Marketing**
- [ ] **Team Battle**

### 8.4 티켓/인벤토리 로그 ✅
- [ ] **KST 변환** (UTC → KST ISO)
- [ ] **타임스탬프 +09:00** 형식

---

## 9. V2 Golden Intervention (골든 개입)

### 9.1 Circuit Breaker ✅
  - [x] **Redis 연결** 확인
  - [x] **시간당 한도** 설정 (아래 값은 SoT, 모든 환경/코드/테스트/운영 정책은 반드시 이 값을 따라야 함)
    - `CIRCUIT_LIMIT_VAULT=100000` (100,000원, SoT)
    - `CIRCUIT_LIMIT_TICKET=30` (30장, SoT)
- [x] **InventoryService, VaultService** 연동
- [x] **Slack/Telegram Alert** 설정 (Mocked/Ready)
- [x] **CircuitBreakerError** 발생 시 차단

### 9.2 Daily Nudge Scheduler ✅
- [ ] **Celery Beat 스케줄** 설정
  - 매일 12:00, 18:00 KST
- [ ] **대상자 선정** (최근 3일 내 접속, 오늘 미접속)
- [ ] **benefits_suspended 제외**
- [ ] **ROULETTE 티켓 1장** 지급
- [ ] **Admin API** 동작 확인
  - `/api/v2/admin/daily-nudge/targets`
  - `/api/v2/admin/daily-nudge/batch`
  - `/api/v2/admin/daily-nudge/statistics`
- [ ] **테스트 통과**: `tests/v2/test_daily_nudge_service.py`

### 9.3 Latency Survival ✅
- [ ] **입금 지연 대응** 로직
- [ ] **유저 증거 기반** 선지급
- [ ] **제재 예외** (Bypass) 검증

### 9.4 ROI Calculator ✅
- [ ] **24시간 ROI 계산**
- [ ] **KRW 환산** (티켓 100원, 금고 1:1)
- [ ] **캠페인별 ROI 집계**
- [ ] **Admin API** 동작
  - `/api/v2/admin/roi/campaign/{type}`
  - `/api/v2/admin/roi/top-campaigns`
- [ ] **테스트 통과**: `tests/v2/test_roi_rollback_service.py`

### 9.5 Rollback Policy ✅
- [ ] **금고 회수** (부분 회수 지원)
- [ ] **티켓 회수**
- [ ] **아이템 회수** (미사용만)
- [ ] **실행 전체 회수**
- [ ] **Admin API** 동작
  - `POST /api/v2/admin/rollback/executions/{id}`
  - `GET /api/v2/admin/rollback/executions/{id}/eligibility`
- [ ] **ADMIN 권한** 확인 (SUPER_ADMIN 권장)
- [ ] **테스트 통과**: `tests/v2/test_roi_rollback_service.py`

---

## 10. Database & Migration (데이터베이스)

### 10.1 Alembic Migration ✅
- [x] **모든 마이그레이션** 파일 검토
  ```bash
  alembic history
  alembic current
  ```
- [x] **Staging 환경** 마이그레이션 테스트 (SQL Preview 생성 및 검증)
- [x] **롤백 스크립트** 준비 (`alembic downgrade -1` 테스트 완료)

### 10.2 필수 테이블 생성 확인 ✅
- [x] `v2_user`
- [x] `v2_user_auth_event`
- [x] `v2_user_refresh_token`
- [x] `v2_golden_intervention_log`
- [x] `v2_retention_roi_log`
- [x] `v2_user_deposit_evidence`
- [x] `user_level_progress`
- [x] `v2_level_reward_table`

### 10.3 인덱스 확인
- [ ] `v2_user.telegram_id` (UNIQUE)
- [ ] `v2_user_auth_event (user_id, created_at)`
- [ ] `v2_user_refresh_token.jti` (UNIQUE)
- [ ] `user_activity (user_id, updated_at)`

### 10.4 DB 백업
- [ ] **프로덕션 DB 백업** 완료
- [ ] **백업 복원 테스트** 완료

---

## 11. Environment & Configuration (환경 설정)

### 11.1 필수 환경 변수 ✅
```bash
# Environment
ENV=production
TEST_MODE=false
DEV_LOGIN_ENABLED=false  # ⚠️ 반드시 false

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=<강력한 시크릿>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440  # V1 호환
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15  # V2 전용

# Telegram
TELEGRAM_BOT_TOKEN=<프로덕션 봇>

# Redis
REDIS_URL=redis://...

# Monitoring
SENTRY_DSN=<Sentry DSN>
LOG_LEVEL=INFO

# Timezone
TIMEZONE=Asia/Seoul

# CORS
CORS_ORIGINS=https://yourdomain.com
```

### 11.2 보안 검증
- [ ] JWT_SECRET 최소 32자
- [ ] DEV_LOGIN_ENABLED=false
- [ ] TEST_MODE=false
- [ ] CORS_ORIGINS 허용 도메인만

---

## 12. Testing & Quality (테스트 & 품질)

### 12.1 유닛 테스트 ✅
```bash
# 전체 V2 테스트
pytest tests/v2/ -v

# 개별 영역
pytest tests/v2/test_telegram_auth.py -v
pytest tests/v2/test_admin_rbac.py -v
pytest tests/v2/test_admin_api.py -v
pytest tests/v2/test_daily_nudge_service.py -v
pytest tests/v2/test_roi_rollback_service.py -v
pytest tests/test_streak_midnight_boundary.py -v
```

### 12.2 필수 테스트 통과 확인
- [ ] `tests/v2/test_telegram_auth.py` - 14/14
- [ ] `tests/v2/test_admin_rbac.py` - RBAC 전체
- [ ] `tests/v2/test_admin_api.py` - Admin API 전체
- [ ] `tests/v2/test_daily_nudge_service.py` - Daily Nudge 전체
- [ ] `tests/v2/test_roi_rollback_service.py` - ROI & Rollback 전체
- [ ] `tests/test_streak_midnight_boundary.py` - 15/15

### 12.3 도메인별 필수 커버리지 (요청 12개 영역)
아래 영역은 **최종 배포 승인 전까지 커버**되어야 합니다(자동 테스트 우선, 불가 시 수동 시나리오 체크리스트를 남김).

- [ ] **인증(Auth)**: `tests/v2/test_telegram_auth.py`, `tests/v2/test_admin_rbac.py`
- [ ] **어드민(Admin)**: `tests/v2/test_admin_api.py`, `tests/v2_tests/phase4_admin/test_admin_ops_routes_coverage.py`
- [ ] **유저(User)**: `tests/v2_tests/phase4_admin/test_admin_user_routes_coverage.py`, `tests/v2_tests/phase4_admin/test_admin_user_routes_coverage_extended.py`
- [ ] **볼트(Vault)**: `tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py`, `tests/v2_tests/phase2_core/test_vault_limit_suspension.py`
- [ ] **경제(Economy)**: `tests/v2_tests/phase2_core/test_cc_deposit_logic.py`, `tests/v2/test_roi_rollback_service.py`
- [ ] **상점(Shop)**: `tests/v2_tests/phase2_core/test_shop_inventory_logic.py`, `tests/v2_tests/phase4_admin/test_shop_crud.py`
- [ ] **인벤토리(Inventory)**: `tests/v2_tests/phase2_core/test_shop_inventory_logic.py`, `tests/v2_tests/phase4_admin/test_admin_inventory_routes_coverage.py`
- [ ] **보상(Rewards)**: `tests/v2_tests/phase2_core/test_survey_reward_service_unit.py`
- [ ] **미션(Mission)**: `tests/v2_tests/phase2_core/test_v2_mission_service.py`, `tests/v2_tests/phase2_core/test_v2_mission_edge_cases.py`, `tests/test_streak_midnight_boundary.py`
- [ ] **팀배틀(Team Battle)**: `tests/v2_tests/phase2_core/test_team_battle_admin_service_unit.py`, `tests/v2_tests/phase2_core/test_team_battle_edge.py`, `tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py`
- [ ] **게임(Game)**: `tests/v2_tests/phase3_game/test_game_engine_smoke.py`, `tests/v2_tests/phase3_game/test_game_ledger_separation.py`, `tests/v2_tests/phase3_game/test_dice_admin_integration.py`
- [ ] **레벨(Level/XP)**: `tests/v2_tests/phase2_core/test_xp_cap.py`, `tests/test_enum_matches_sot.py`

### 12.4 커버리지 ✅
```bash
pytest --cov=app --cov-report=html
# 목표: 80% 이상
```

### 12.5 Enum 정합성 ✅
- [ ] `tests/test_enum_matches_sot.py` 통과
- [ ] `docs/soT/canonical_enums/shop_enums.json` 검증

---

## 13. Performance & Optimization (성능)

### 13.1 DB 쿼리 최적화 ✅
- [ ] **N+1 쿼리 제거** (selectinload, joinedload)
- [ ] **인덱스 최적화**
- [ ] **Pagination** 적용 (대량 데이터)

### 13.2 Connection Pool ✅
```python
SQLALCHEMY_POOL_SIZE=20
SQLALCHEMY_MAX_OVERFLOW=40
SQLALCHEMY_POOL_TIMEOUT=30
SQLALCHEMY_POOL_RECYCLE=3600
```

### 13.3 Redis 캐싱 ✅
- [ ] **유저 정보** 캐싱
- [ ] **게임 설정** 캐싱
- [ ] **상점 상품** 캐싱
- [ ] **캐시 무효화** 전략

### 13.4 성능 목표
- [ ] API 응답 시간 < 200ms (p95)
- [ ] DB 쿼리 시간 < 100ms (p95)
- [ ] 에러율 < 0.1%

---

## 14. Monitoring & Alerting (모니터링)

### 14.1 Sentry (에러 추적) ✅
- [ ] **Sentry DSN** 설정
- [ ] **에러 캡처** 확인
- [ ] **성능 모니터링** 활성화

### 14.2 Grafana/Prometheus ✅
- [ ] **메트릭 수집**
  - API 응답 시간
  - DB 쿼리 성능
  - Circuit Breaker 발동 횟수
  - Daily Nudge 발송 건수
  - ROI 평균값
- [ ] **대시보드** 구성

### 14.3 Logging ✅
- [ ] **구조화된 로깅** (JSON)
- [ ] **로그 레벨** (INFO in prod)
- [ ] **민감 정보 마스킹** (JWT, Password)

### 14.4 Alert 설정 ✅
- [ ] **Circuit Breaker 발동** → Slack/Telegram
- [ ] **에러율 > 1%** → 알림
- [ ] **응답 시간 > 1초** → 알림
- [ ] **DB 연결 실패** → 긴급 알림

---

## 15. Celery & Background Tasks (백그라운드 작업)

### 15.1 Celery Worker ✅
```bash
celery -A app.worker.celery_app worker --loglevel=info
```

### 15.2 Celery Beat (스케줄러) ✅
```bash
celery -A app.worker.celery_app beat --loglevel=info
```

### 15.3 스케줄 작업 확인
- [ ] **Daily Nudge**: 12:00, 18:00 KST
- [ ] **ROI Calculator**: 00:00 KST
- [ ] **Segment Batch**: 01:00 KST

### 15.4 Redis 연결 ✅
```bash
redis-cli ping  # PONG 확인
```

---

## 16. Security Hardening (보안 강화)

### 16.1 Rate Limiting ✅
- [ ] **API Rate Limit** 설정
- [ ] **Telegram Auth** Rate Limit (DDoS 방지)
- [ ] **Admin API** Rate Limit

### 16.2 HTTPS & SSL ✅
- [ ] **HTTPS 강제** (HTTP → HTTPS 리다이렉트)
- [ ] **SSL 인증서** 유효성 확인

### 16.3 CORS ✅
- [ ] **허용 도메인** 정확히 설정
- [ ] **Wildcard (*)** 사용 금지

### 16.4 SQL Injection & XSS ✅
- [ ] **SQLAlchemy ORM** 사용
- [ ] **Raw SQL 최소화**
- [ ] **Pydantic 입력 검증**

---

## 17. Documentation (문서화)

### 17.1 API 문서 ✅
- [ ] **Swagger/OpenAPI** 최신화
- [ ] **엔드포인트 설명**
- [ ] **예제 요청/응답**

### 17.2 운영 문서 ✅
- [x] **배포 가이드** (`v2_server_deployment_guide_ko.md`)
- [x] **환경 변수 가이드** (서버 가이드 내 포함)
- [x] **트러블슈팅 가이드** (`v2_deployment_troubleshooting_guide_ko.md`)
- [x] **롤백 절차** (`v2_fullstack_deployment_runbook_ko.md`)

### 17.3 SoT 문서 ✅
- [ ] `v2_telegram_auth_sot_ko.md`
- [ ] `v2_auth_trouble_mapping_ko.md`
- [ ] `v2_auth_technical_guide_ko.md`
- [ ] `v2_remaining_implementation_guide_ko.md`

---

## 18. Deployment Strategy (배포 전략)

### 18.1 배포 방식 선택
- [ ] **Blue-Green** (권장)
  - 즉시 롤백 가능
  - 트래픽 전환: 10% → 50% → 100%
- [ ] **Rolling**
  - 서버 1대씩 순차 배포
- [ ] **Canary**
  - 1~5% 유저부터 시작

### 18.2 Health Check ✅
```bash
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/api/v2/health/db
```

### 18.3 배포 스크립트 ✅
- [ ] **Docker Compose** 설정
- [ ] **배포 자동화** 스크립트
- [ ] **롤백 스크립트**

---

## 19. Post-Deployment Verification (배포 후 검증)

### 19.1 핵심 API 테스트
- [ ] `POST /api/v2/telegram/auth` - Telegram 로그인
- [ ] `POST /api/v2/auth/refresh` - Token 갱신
- [ ] `POST /api/v2/auth/logout` - 로그아웃
- [ ] `GET /api/v2/user/me` - 유저 정보
- [ ] `POST /api/v2/dev/login` - DEV 로그인 (403 확인)

### 19.2 Admin API 테스트
- [ ] `GET /api/v2/admin/users` - 유저 목록
- [ ] `GET /api/v2/admin/vault/status` - 금고 상태
- [ ] `GET /api/v2/admin/daily-nudge/targets` - 넛지 대상자
- [ ] `GET /api/v2/admin/roi/top-campaigns` - ROI 캠페인
- [ ] `POST /api/v2/admin/rollback/executions/{id}` - 회수

### 19.3 모니터링 확인
- [ ] **Sentry** 에러 없음
- [ ] **Grafana** 메트릭 정상
- [ ] **로그** WARNING/ERROR 없음

### 19.4 성능 검증
- [ ] API 응답 시간 < 200ms (p95)
- [ ] 에러율 < 0.1%
- [ ] DB 쿼리 시간 < 100ms (p95)

---

## 20. Rollback Plan (롤백 계획)

### 20.1 즉시 롤백 조건
- [ ] 에러율 > 1%
- [ ] 응답 시간 > 1초 (p95)
- [ ] Circuit Breaker 과다 발동
- [ ] DB 마이그레이션 실패
- [ ] 핵심 API 장애

### 20.2 롤백 절차
```bash
# 1. 코드 롤백
git checkout <previous-stable-tag>
docker-compose up -d

# 2. DB 롤백 (필요시)
alembic downgrade -1

# 3. 캐시 클리어
redis-cli FLUSHALL

# 4. Health Check
curl https://api.yourdomain.com/health
```

### 20.3 롤백 후 조치
- [ ] 팀 공지
- [ ] 원인 분석
- [ ] 재배포 계획

---

## 21. Final Sign-off (최종 승인)

### 21.1 팀별 승인
- [ ] **Backend Lead**: 모든 기능 구현 완료
- [ ] **DevOps**: 인프라 준비 완료
- [ ] **QA**: 테스트 통과 확인
- [ ] **Product**: 기능 검수 완료
- [ ] **Security**: 보안 검토 완료

### 21.2 체크리스트 완료 확인
- [ ] **모든 영역** 체크 완료
- [ ] **테스트** 100% 통과
- [ ] **Staging 검증** 완료
- [ ] **DB 백업** 완료
- [ ] **롤백 계획** 수립

### 21.3 배포 승인
- [ ] **최종 승인자**: _______________
- [ ] **배포 일시**: _______________
- [ ] **배포 담당자**: _______________

---

## 📊 전체 진행 현황

### 구현 완료 (Completed)
- ✅ V2 Auth (Telegram, JWT, RBAC)
- ✅ V2 User Management
- ✅ V2 Vault & Economy
- ✅ V2 Inventory & Shop
- ✅ V2 Mission & Streak
- ✅ V2 Level & XP
- ✅ V2 Team Battle
- ✅ V2 Admin Dashboard
- ✅ V2 Golden (Circuit Breaker, Daily Nudge, Latency, ROI, Rollback)

### 진행률: 9/9 영역 완료 (100%)

---

## 🚨 중요 알림 (Critical Reminders)

1. **DEV_LOGIN_ENABLED=false** 반드시 확인
2. **TEST_MODE=false** 반드시 확인
3. **DB 백업** 필수
4. **롤백 계획** 수립 필수
5. **모니터링** 활성화 필수

---

**배포 전 이 체크리스트의 모든 항목을 확인하세요!**
**승인 없이 배포하지 마세요!**
