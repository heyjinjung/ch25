## [2026-02-02 구현 완료 항목]

### [2026-02-02] W05 트러블슈팅 결과 반영 및 SoT 승격 ✅
- **문제 해결**: W05 기간 중 발생한 인증, DB, 미션, 게임 도메인 이슈의 소급 적용.
- **핵심 정책 확정**:
  - **Auth**: `v2_user_auth_event` 물리적 FK 미설정 사유(성능/LOGIN_FAILED) 명문화.
  - **DB**: 게임 로그(`dice`, `roulette`, `lottery`) 및 상점 주문 테이블의 `user_id` FK를 `ON DELETE SET NULL`로 표준화.
  - **Mission**: 신규 유저 미션 자격 기간을 **7일(168시간)**로 확정 및 FAB 타이머 디자인 가이드 수립.
  - **Golden**: 골든아워 적용 시 전역 Config와 게임별 Config의 **AND 조건** 교차 검증 로직 확정.
  - **Vault**: 세그먼트별(COMMON/VIP/WHALE/AT_RISK) 일일 사용 목표 금액 기준 공식화.
- **아카이브**: W05 문서를 `archive/weekly/` 폴더로 이동 및 README 앵커 링크 업데이트 완료.
- **문서**:
  - `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/auth/v2_telegram_auth_sot_ko.md`
  - `docs/v2_specs/04_db/v2_db_baseline_snapshot_ko.md`
  - `docs/v2_specs/02_game/v2_new_user_mission_logic_sot_ko.md`
  - `docs/v2_specs/07_golden/v2_golden_hour_policy_sot_ko.md`
  - `docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md`

### [2026-02-02] CSV 데이터 통합 확장 - 모든 대시보드 연동 ✅
- **문제 해결**: 분석 대시보드 "오늘 수익 ₩0" + Ops Dashboard 기회 그룹 미표시
- **백엔드 구현**:
  - `app/v2/models/v2_game_log.py` - 게임 로그 영속 저장 테이블
  - `alembic/versions/20260202_1400_add_v2_game_log.py` - 마이그레이션
  - `app/v2/services/game_log_analytics_service.py` - 수익/위험/기회 분석 서비스
  - `app/v2/schemas/v2_admin_ops.py` - RevenueStatsDto, DetailedRiskUserDto, OpportunityUserDto 추가
  - `app/v2/api/admin/ops_routes.py` - GameLogAnalyticsService 연동
  - `app/v2/services/csv_import_service.py` - `save_to_db` 옵션으로 DB 저장 지원
- **프론트엔드 구현**:
  - `src/v2/api/adminApi.ts` - 신규 DTO 인터페이스 추가
  - `src/v2/admin/pages/dashboard/OpsDashboard.tsx` - opportunityUsers 리스트 표시
  - `src/v2/admin/pages/ops/AnalyticsDashboard.tsx` - CSV revenueStats fallback 적용
- **데이터 흐름**: CSV Import → V2GameLog 저장 → Analytics Service → /ops/status API → Dashboard UI
- **문서**: `learned_/golden/20260202_csv_data_integration_expansion_implementation.md`

---

## [2026-01-31 구현 완료 항목]

### [2026-01-31] 복권 퍼즐모음 → 골드키 교환 풀스택 구현 ✅
- **문제 해결**: PUZZLE_C2 당첨 시 reward_amount=0으로 인해 미지급 버그 수정
- **PUZZLE_C 폐기**: PUZZLE_C → PUZZLE_C1/C2 분리 정책 확립
- **백엔드 구현**:
  - `app/v2/services/v2_exchange_service.py` - 퍼즐 교환 서비스
  - `app/v2/api/exchange_routes.py` - V2 Exchange API 라우터
  - `POST /api/v2/exchange/craft-puzzle` - 퍼즐 4종 → 골드키 1개 교환
  - `GET /api/v2/exchange/craft-status` - 교환 가능 여부 조회
- **프론트엔드 구현**:
  - `src/v2/api/gameApi.ts`, `v2GameAdapter.ts` - craftPuzzleToGoldKey 함수
  - `src/v2/pages/game/LotteryPage.tsx` - onCraft 실제 API 연동
- **마이그레이션**: `20260131_0500_puzzle_c_deprecation_cleanup.py`
  - v2_lottery_prize PUZZLE_C2 reward_amount 0→1 수정
  - user_game_wallet PUZZLE_C 잔액 → PUZZLE_C1 이전
- **문서**: 
  - `docs/v2_specs/90_troubleshooting/20260131_복권_퍼즐조각_미지급_버그.md`
  - `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/20260131_puzzle_collection_gold_key_craft.md`

---

## [2026-01-29 구현 완료 항목]

### [2026-01-29] V2 ROI Calculator & Rollback Policy 구현 완료 ✅
- **ROI Calculator Service**:
  - `app/v2/services/roi_analysis_service.py` - ROI 계산 및 분석
  - `app/v2/api/admin/roi_routes.py` - Admin ROI API
  - 24시간 윈도우 내 행동 추적 및 KRW 환산 ROI 계산
  - 캠페인별 ROI 집계 및 상위 캠페인 조회
- **Rollback Policy Service**:
  - `app/v2/services/rollback_service.py` - 회수 로직 (금고/티켓/아이템)
  - `app/v2/api/admin/rollback_routes.py` - Admin 회수 API
  - 부분 회수 (Partial Clawback) 정책 적용
  - 실행 전체 회수 및 가능 여부 사전 확인
- **테스트**: `tests/v2/test_roi_rollback_service.py` - ROI 계산, 회수 로직, 엣지 케이스
- **문서**: `docs/v2_specs/07_golden/2026_01_29_golden_v2_remaining_implementation_guide_ko.md` 업데이트

### [2026-01-29] V2 Daily Nudge Scheduler 구현 완료 ✅
- **목적**: 리텐션 유지를 위한 일일 무료 토큰 자동 발송
- **구현 항목**:
  - `app/v2/services/daily_nudge_service.py` - 넛지 대상자 선정 및 발송 로직
  - `app/v2/tasks/daily_nudge_tasks.py` - Celery Beat 스케줄러 태스크
  - `app/v2/api/admin/daily_nudge_routes.py` - Admin 관리 API
  - `tests/v2/test_daily_nudge_service.py` - 단위 테스트 (200+ assertions)
- **기능**:
  - 최근 3일 내 접속했으나 오늘 접속 안 한 유저 타겟팅
  - `benefits_suspended` (7일 무입금) 유저 자동 제외
  - 매일 12:00, 18:00 KST 스케줄 실행
  - ROULETTE 티켓 1장 자동 지급
  - Admin API: 대상자 조회, 수동 발송, 배치 실행, 통계 조회
- **검증**: 타겟 선정, 제재 체크, 배치 실행, 시간대 처리, 엣지 케이스 테스트 완료
- **문서**: `docs/v2_specs/07_golden/2026_01_29_golden_v2_remaining_implementation_guide_ko.md` 업데이트

### [2026-01-29] V2 Auth SoT 트러블 예상율 0% 달성 ✅
- **문제**: V2 Auth 관련 5개 충돌 포인트 미해결
- **해결**:
  1. **3.1 Activity 경로 불일치**: `app/v2/api/activity_routes.py`에 `/record` 별칭 추가
  2. **3.2 DEV 로그인 환경 제한**: `app/core/config.py`에 `dev_login_enabled: bool = False` 플래그 추가
  3. **3.3 Telegram hash 검증**: `app/v2/core/telegram.py` V2 전용 모듈 (hmac.compare_digest 사용)
  4. **3.4 Access Token 만료**: `v2_access_token_expire_minutes: int = 15` V2 전용 설정 분리
  5. **2.4 Admin RBAC 로깅**: `app/api/deps.py`에 `RBAC_DENIED` 이벤트 기록 추가
- **검증**: 모든 충돌 포인트 해결, 트러블 예상율 0%
- **문서**: `docs/v2_specs/00_sot_meta/v2_auth_trouble_mapping_ko.md` v1.2

### [2026-01-28~29] V2 Telegram Auth SoT 구현 완료 ✅
- **목표**: 텔레그램 Mini App 전용 인증 SoT 수립
- **핵심 원칙**: V2 경로 아래 신규 파일 생성, V1 의존성 완전 제거
- **구현 항목**:
  - `app/v2/core/telegram.py` - initData HMAC-SHA256 검증 (hash 비교 포함)
  - `app/v2/models/auth_event.py` - V2UserAuthEvent, AuthEventType Enum
  - `app/v2/models/refresh_token.py` - V2UserRefreshToken 모델
  - `app/v2/api/telegram_routes.py` - POST /api/v2/telegram/auth (순수 V2)
  - `app/v2/api/auth_routes.py` - /refresh, /logout 엔드포인트
  - `app/v2/services/auth_service.py` - log_auth_event, V2AuthService 확장
  - `alembic/versions/20260128_1800_add_v2_auth_tables.py` - DB Migration
- **테스트**:
  - `tests/v2/test_telegram_auth.py` - 14개 유닛 테스트 통과
  - `scripts/generate_test_init_data.py` - 수동 테스트용 initData 생성기
- **정책**:
  - Access Token: 15분 만료 (V2 전용)
  - Refresh Token: 30일 만료, 7일 미만 시 갱신 (sliding window)
  - Auth Event: 로그인 성공/실패, 토큰 갱신, 로그아웃, RBAC 거부 기록
- **문서**:
  - `docs/v2_specs/00_sot_meta/v2_telegram_auth_sot_ko.md`
  - `docs/v2_specs/00_sot_meta/v2_auth_technical_guide_ko.md`
  - `docs/v2_specs/00_sot_meta/v2_auth_trouble_mapping_ko.md`

---

## [2026-01-28 구현 완료 항목]

### [2026-01-28] User/V2User 금고 잔액 동기화 누락 수정 ✅
- **문제**: 레거시 브릿지를 통한 게임 플레이 시 V2User 테이블 잔액 갱신 누락
- **해결**: `vault_legacy_bridge.py`에서 레거시 연산 후 V2User 잔액 강제 동기화 적용
- **검증**: 백엔드 시나리오 테스트(`test_dice_play_vault_deduction`) 100% 통과
- **문서**: `learned_/vault/20260128_vault_balance_sync_update.md`

### [2026-01-27 구현 완료 항목]

### [2026-01-27] V2 상점 구매 후 금고 잔액 UI 갱신 누락 수정 ✅
- **문제**: `POST /api/v2/shop/purchase` 200 OK + 아이템 적재는 정상인데, 헤더/유저 화면 금고 잔액이 즉시 감소하지 않음
- **원인**: 프론트 구매 성공 후 react-query invalidate 키 불일치 (`['vault-status']` → 실제는 `['v2-vault-status']`)
- **해결**:
  - `src/v2/hooks/useV2Shop.ts` 수정: `['v2-vault-status']`, `['v2-user-me']` 무효화로 즉시 재조회
- **검증**: 프론트 빌드 통과 및 DB 차감 확인

### [2026-01-27] 출금조건 모달 "오늘 사용 금액" 상점 구매 반영 누락 수정 ✅
- **문제**: 상점에서 VAULT 결제 후에도 `GET /api/v2/vault/status`의 `daily_vault_spent`가 0으로 유지
- **원인**: V2 상점 구매 경로가 잔액 차감만 수행하고 `User.vault_spent_today`(=daily_vault_spent) 누적/원장 기록이 누락
- **해결**:
  - `app/v2/services/vault_service.py`에 소비 전용 차감 로직 추가(운영일 KST 09:00 리셋 포함)
  - `app/v2/services/shop_service.py`에서 VAULT 결제 시 해당 로직 사용
- **검증**: 컨테이너 재시작 후 소비 발생 시 `daily_vault_spent` 증가 및 `VaultLedger(ref_type=SHOP)` 기록 확인
- **문서**: `learned_/vault/20260127_vault_today_spent_shop_purchase_update.md`

## [2026-01-26 구현 완료 항목]

### [2026-01-26] V2 유저 삭제/퍼지 서비스 신규 구현 ✅
- **문제**: V2 폴더(app/v2/services)에 유저 삭제/퍼지 기능이 없어, V1(app/services/admin_user_service.py) 의존
- **해결**:
  - `app/v2/services/admin_user_service.py` 수정 - `delete_user()`, `purge_user()` 메서드 추가
    - `delete_user()`: 일반 삭제 (CASCADE 의존, TeamMember 명시 정리)
    - `purge_user()`: 강제 삭제 (모든 연관 테이블 방어적 삭제)
  - `app/v2/api/admin/user_routes.py` 수정 - V2 엔드포인트 추가
    - `DELETE /api/v2/admin/users/{user_id}` - 일반 삭제
    - `POST /api/v2/admin/users/{user_id}/purge` - 강제 퍼지
  - 권한: SUPER_ADMIN만 삭제/퍼지 가능
  - 감사 로그: V2AdminAuditService 연동 (DELETE_USER, PURGE_USER 액션 기록)
- **정책**: V2 Native 구현, 배포 후 V1 일괄 삭제 예정
- **검증**: V2 엔드포인트로 유저 삭제/퍼지 정상 동작

### [2026-01-26] 티켓/인벤토리 로그 KST 변환 적용 ✅
- **문제**: 티켓/인벤토리 로그의 timestamp가 UTC로 반환되어 운영/프론트에서 시간 오프셋 혼동 발생
- **해결**:
  - `app/utils/timezone.py` 수정 - `utc_to_kst()`, `utc_to_kst_iso()` 헬퍼 함수 추가
  - `app/v2/api/admin/economy_routes.py` 수정 - TicketLogDto 응답 시 KST ISO 형식으로 변환
  - `app/v2/api/admin/user_routes.py` 수정 - UserActivityLogDto 응답 시 KST 변환 적용
- **정책**: DB 저장은 UTC, API 응답은 KST ISO 형식(+09:00)으로 통일
- **검증**: 어드민 로그 조회 시 KST 시간대로 표시됨

### 1. Reset-time Unification (09:00 KST 통일) ✅
- **문제**: `AdminDashboardService`가 00:00 KST 기준 사용 vs V2 서비스들(mission, vault)이 09:00 KST 사용
- **해결**:
  - `app/utils/timezone.py` 신규 생성 - `business_day_start()`, `yesterday_business_day_range()` 헬퍼
  - `app/services/admin_dashboard_service.py` 수정 - 00:00→09:00 KST 통일
- **검증**: 모든 일간 집계가 09:00 KST ~ 익일 08:59:59 KST 기준으로 동작

### 2. Global Circuit Breaker (Payout Safety) ✅
- **문제**: SoT 문서에만 존재하던 서킷 브레이커 코드 미구현
- **해결**:
  - `app/services/circuit_breaker.py` 신규 생성
    - Redis 기반 일일 지급 추적
    - CLOSED/OPEN/HALF_OPEN 상태 관리
    - 50M 기본 한도, 80% 경고 임계값
    - DB fallback 지원
  - `app/v2/services/vault2_service.py` 수정 - `record_unlock_event()`에 서킷 브레이커 훅 추가
- **검증**: `skip_circuit_breaker=True` 옵션으로 관리자 강제 지급 가능

### 3. V2 Team-Battle Admin ✅
- **문제**: V2 팀배틀 어드민 API 레이어 없음
- **해결**:
  - `app/v2/services/team_battle_admin_service.py` 신규 생성
    - 시즌 CRUD (create/update/end)
    - 팀 관리 (create/update/detail)
    - 점수 조정 (`adjust_team_score`)
    - 멤버 강제 관리 (`force_join_team`, `force_leave_team`)
    - 시즌 통계 (`get_season_stats`)
  - `app/v2/api/admin/team_battle_routes.py` 신규 생성
    - `/admin/team-battle/seasons/*` 시즌 엔드포인트
    - `/admin/team-battle/teams/*` 팀 엔드포인트
    - `/admin/team-battle/scores/adjust` 점수 조정
    - `/admin/team-battle/members/force-join`, `/force-leave` 멤버 관리
  - `app/v2/api/admin/__init__.py` 수정 - 라우터 등록
- **검증**: 모든 어드민 작업에 V2AdminAuditService 감사 로그 기록

### 4. Admin Audit Logs — Full Coverage ✅

### [2026-01-26] useAdminGame.ts 미사용 타입 import(AdminTeamBattleSeasonDto) 제거
- ESLint no-unused-vars 오류 해소
- 기능/로직 영향 없음, 코드 정합성 개선
- **문제**: 감사 로그가 일부 영역(economy, inventory, game_config, vault)에만 적용
- **해결**:
  - `app/v2/middleware/admin_audit.py` 신규 생성
    - `@audit_admin` 데코레이터
    - `log_admin_action()` 헬퍼 함수
  - `app/v2/api/admin/segment_routes.py` 수정 - 감사 로그 추가
    - `SEGMENT_BATCH_RUN`, `SEGMENT_RULE_CREATE/UPDATE/DELETE`
  - `app/v2/api/admin/marketing_routes.py` 수정 - 감사 로그 추가
    - `MARKETING_MESSAGE_CREATE`, `SURVEY_CREATE/UPDATE/DELETE`
- **검증**: 모든 어드민 CRUD 작업이 `admin_audit_log` 테이블에 기록



## [2026-01-26 구현 완료 항목]

### 1. 09:00 KST 리셋 정책 통합 ✅
- **문제**: MissionService(기본값 0)와 VaultService(9) 간 리셋 시간 불일치
- **해결**:
  - `app/services/mission_service.py` 수정 - `_operational_play_date` 기본값 0→9
  - `app/v2/services/vault_service.py` 수정 - `get_admin_stats`가 `app/utils/timezone.py` 헬퍼 사용
- **검증**: Mission/Vault/Admin 모두 09:00 KST 기준으로 통일

### 2. benefits_suspended 로직 정식화 ✅
- **문제**: 7일 무입금 제재 정책이 DB 필드 없이 계산식으로만 존재
- **해결**:
  - `app/v2/services/vault_service.py`에 `is_benefits_suspended()` 정적 메서드 추가
  - `(is_suspended: bool, deposit_7d: int)` 튜플 반환
- **검증**: API 응답에 제재 여부와 7일 입금 합계를 명시적으로 포함 가능

### 3. 세그먼트 배치 동기화 점검 및 자동화 ✅
- **확인**: `scripts/segment_users.py`에 `db.commit()` 정상 포함
- **신규**: `scripts/user_consistency_check.py` 정합성 점검 스크립트 생성
  - `--check segment`: 25시간 내 미업데이트 유저 점검
  - `--check migration`: user↔v2_user 이관 누락 점검
  - `--check suspended`: 7일 무입금 유저 현황
  - `--check index`: 핵심 인덱스 존재 여부
  - `--check all`: 전체 점검

  ## [2026-01-26 구현 완료 항목] - Remediation Guide 기반
  
  ### A. Admin user list vault_balance 수정 ✅
  - **문제**: Admin 유저 목록/상세에서 `vault_balance = locked + available` 사용 (SoT 위반)
  - **해결**:
    - `app/v2/api/admin/user_routes.py` 수정 (4곳)
      - 정렬 컬럼: `func.coalesce(User.vault_locked_balance, 0)` 단일 사용
      - 응답 DTO: `vault_balance = int(user.vault_locked_balance or 0)` 단일 사용
  - **검증**: sortBy=vault_balance 시 locked만 기준으로 정렬됨
  
  ### B. Dashboard 집계 total_vault_balance 수정 ✅
  - **문제**: 대시보드/랭킹 집계가 `(locked + available)` 기반 (SoT 위반)
  - **해결**:
    - `app/services/admin_dashboard_service.py` 수정 (2곳)
      - Overview: `func.sum(User.vault_locked_balance)` 단일 사용
      - Metric Detail: `User.vault_locked_balance > 0` 필터, `vault_locked_balance.desc()` 정렬
  - **검증**: KPI/리포트가 locked 기준으로 집계됨
  
  ### E. FE adapter availableBalance 처리 ✅
  - **문제**: 호환 어댑터가 `availableBalance`를 노출 (정책 표현 충돌)
  - **해결**:
    - `src/v2/api/v1CompatAdapter.ts` 수정
      - `availableBalance: 0` 고정 (deprecated 주석 추가)
      - `vaultBalance = lockedBalance` 단일 기준
  - **검증**: FE에서 available 값이 항상 0으로 반환됨

---

## [2026-01-26 구현 완료 항목] - Vault Remediation Phase 2

### C. Withdrawals route 통합 ✅
- **문제**: `/api/v2/admin/withdrawals/*`(economy_routes)와 `/api/v2/admin/vault/withdrawals/*`(vault_routes) 중복
- **해결**:
  - `app/v2/api/admin/economy_routes.py` 수정 - 엔드포인트에 deprecation 주석 추가
  - `app/v2/api/admin/vault_routes.py` 수정 - canonical API로 명시
- **검증**: FE는 `/api/v2/admin/vault/withdrawals/*` 사용 권장

### D. Admin prefix 표준화 ✅
- **문제**: `/admin/api/*` (legacy)와 `/api/v2/admin/*` (v2) 공존
- **해결**:
  - `src/api/teamBattleApi.ts` 수정 - Admin API 경로 `/admin/api/*` → `/api/v2/admin/*` 변경
- **검증**: 모든 Admin API가 `/api/v2/admin/*` 프리픽스 사용

### F. Enum/Constants 정규화 ✅
- **문제**: RewardType, TicketType 등이 여러 파일에서 분산 정의
- **해결**:
  - `app/v2/schemas/v2_constants.py` 신규 생성
    - `RewardType` Literal 중앙화 (VAULT, POINT, CC_POINT 등)
    - `TicketType` Literal 중앙화
    - `GameTokenTypeLiteral` 참조용 정의
    - `RouletteGrade`, `AnimationType`, `GameResult` 포함
- **검증**: 신규 스키마는 v2_constants.py에서 import 권장

### 레거시 available balance 마이그레이션 ✅
- **상태**: 이미 정리됨 (0건 남음)
- **검증**: `SELECT COUNT(*) FROM user WHERE vault_available_balance != 0` → 0

### VaultPage.tsx 수정 ✅
- **문제**: `availableBalance` 사용으로 항상 0원 출금 시도
- **해결**:
  - `src/v2/pages/vault/VaultPage.tsx` 수정
    - confetti 조건: `vault.availableBalance` → `vault.vaultBalance`
    - 출금 요청: `vault.availableBalance` → `vault.vaultBalance`
- **검증**: 출금 금액이 locked balance 기준으로 정상 동작

### VaultBalanceCard.tsx 수정 ✅
- **문제**: `available` prop 표시로 항상 0원 표시
- **해결**:
  - `src/v2/components/vault/VaultBalanceCard.tsx` 수정
    - `available` prop deprecated 처리 (optional + JSDoc)
    - 출금 가능 금액 = `balance` (= vault_locked_balance) 단일 사용
- **검증**: UI에 locked balance가 출금 가능 금액으로 표시

---

## [2026-01-26 구현 완료 항목] - Game/Shop 정책 구현 (01~04 가이드 기반)

### 01. Strict Vault Policy - benefits_suspended 상점 차단 ✅
- **문제**: 7일 무입금 유저(`benefits_suspended=True`)가 상점 구매 가능 (SoT 위반)
- **해결**:
  - `app/v2/services/shop_service.py` 수정
    - `purchase()` 진입부에 `V2VaultService.is_benefits_suspended()` 체크 추가
    - 제재 유저 구매 시도 시 `ValueError("BENEFITS_SUSPENDED")` 발생
    - `skip_suspension_check` 파라미터로 관리자 강제 구매 허용
  - `app/v2/api/routes.py` 수정
    - `purchase_shop_product()` 엔드포인트에 early exit 검사 추가
    - 제재 유저 → `HTTPException(403, "BENEFITS_SUSPENDED")`
- **검증**: 7일 무입금 유저의 구매 요청 시 403 응답

### 02. Empty Shop Risk - 운영자 알림 ✅
- **문제**: 상점 UI Config 비어있을 때 운영자에게 알림 없음
- **해결**:
  - `app/v2/api/routes.py` - `list_shop_products()` 수정
    - 빈 상품 목록 감지 시 로깅 + Sentry 알림 전송
    - `sentry_sdk.capture_message()` 호출 (warning 레벨)
- **검증**: 빈 상품 설정 시 Sentry 이벤트 `shop_empty_products` 발생

### 03. Enum Naming Consistency - SoT JSON + 검증 테스트 ✅
- **문제**: Enum/상수가 코드/DB/프론트에서 분산 정의되어 drift 발생 가능
- **해결**:
  - `docs/soT/canonical_enums/shop_enums.json` 신규 생성
    - RewardType, TicketType, GameTokenType, CostType 등 정의
    - deprecated 값, storage mapping 메타데이터 포함
  - `tests/test_enum_matches_sot.py` 신규 생성
    - `v2_constants.py` Literal과 SoT JSON 일치 검증
    - CI 실행으로 Enum drift 방지
- **검증**: `pytest tests/test_enum_matches_sot.py -v` 통과

### 04. Ops Checklist ✅
- **상태**: Runbook 참조 문서 (코드 변경 없음)
- **내용**: 
  - Suspended User Purchase Attempts Runbook
  - Empty Shop Incident Runbook
  - Deployment Checklist

---

## [수정 파일 목록 - Phase 2]

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/api/admin/economy_routes.py` | `/withdrawals` 엔드포인트 deprecation 주석 |
| `app/v2/api/admin/vault_routes.py` | canonical 명시 주석 추가 |
| `app/v2/schemas/v2_constants.py` | 신규 - 중앙화된 Enum/Literal 정의 |
| `src/api/teamBattleApi.ts` | Admin API 경로 v2로 마이그레이션 |
| `src/v2/pages/vault/VaultPage.tsx` | `availableBalance` → `vaultBalance` |
| `src/v2/components/vault/VaultBalanceCard.tsx` | `available` prop deprecated |

## [수정 파일 목록 - Game/Shop 정책 (01~04)]

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/services/shop_service.py` | `benefits_suspended` 체크 로직 추가 |
| `app/v2/api/routes.py` | 상점 구매 403 처리, empty shop Sentry 알림 |
| `docs/soT/canonical_enums/shop_enums.json` | 신규 - Enum SoT JSON 정의 |
| `tests/test_enum_matches_sot.py` | 신규 - Enum 정합성 자동 검증 테스트 |

---

## [2026-01-26 구현 완료 항목] - Inventory 정책 구현 (05.inventory 가이드 기반)

### 05-1. Inventory Service benefits_suspended 체크 ✅
- **문제**: `V2InventoryService.use_voucher()`에 7일 무입금 유저 차단 로직 누락
- **해결**:
  - `app/v2/services/inventory_service.py` 수정
    - `use_voucher()` 진입부에 `V2VaultService.is_benefits_suspended()` 체크 추가
    - 제재 유저 바우처 사용 시 `HTTPException(403, "BENEFITS_SUSPENDED")`
    - `skip_suspension_check` 파라미터로 관리자 강제 사용 허용
- **검증**: 7일 무입금 유저의 바우처 사용 요청 시 403 응답

### 05-2. 기프티콘 네이밍 검증 스크립트 ✅
- **문제**: `{BRAND}_GIFTICON_{AMOUNT}` 포맷 준수 여부 자동 검증 없음
- **해결**:
  - `scripts/validate_gifticon_naming.py` 신규 생성
    - 소문자 포함 검출
    - 정규식 포맷 검증
    - 100원 단위 금액 검증
    - `--dry-run` 샘플 테스트, `--fix-preview` 수정 제안
- **검증**: `python scripts/validate_gifticon_naming.py --dry-run` 실행 성공

### 05-3. V2 전용 Inventory Model 리팩토링 🟡 (TODO)
- **상태**: 장기 작업으로 별도 트래킹 (이번 스코프 외)
- **내용**: `app.models.inventory` V1 공용 모델 → `app.v2.models.inventory` 분리 필요

---

## [2026-01-26 구현 완료 항목] - Mission 정책 구현 (09~10.mission 가이드 기반)

### A. FE 라우팅 /v2/missions canonical ✅
- **문제**: Design 문서에는 `/v2/missions` 표기이나 실제 FE는 `/missions` 사용
- **해결**:
  - `src/v2/router/V2UserRoutes.tsx` 수정
    - Canonical route: `/v2/missions` → `<MissionsPage />`
    - Legacy redirect: `/missions` → `/v2/missions` (3주 유지 후 제거)
- **검증**: `/missions` 접속 시 `/v2/missions`로 리다이렉트

### B. 레거시 BE Deprecation 헤더 ✅
- **문제**: 레거시 `/api/mission/*` 라우터가 V2와 병존
- **해결**:
  - `app/api/routes/mission.py` 수정
    - 모든 엔드포인트에 `Deprecation: true` 헤더 추가
    - `Sunset: 2026-02-26` 헤더 추가
    - `Link: </api/v2/mission>; rel="successor-version"` 헤더 추가
    - 태그 변경: `mission` → `mission-legacy`
- **검증**: 레거시 호출 시 응답 헤더에 deprecation 정보 포함

### C. StreakService 분리 ✅
- **문제**: 스트릭 로직이 `V2MissionService`에 혼재
- **해결**:
  - `app/v2/services/streak_service.py` 신규 생성
    - `get_user_streak_info()`: 유저 스트릭 정보 조회
    - `get_pending_streak_milestone()`: 클레임 가능 마일스톤 조회
    - `claim_streak_reward()`: 스트릭 보상 클레임
    - `get_operational_play_date()`: 운영일 계산 (09:00 KST 리셋)
    - `reset_user_streak()`: 스트릭 초기화 (관리자용)
- **검증**: 독립적인 StreakService 제공, MissionService와 분리

### E. 시간 경계 테스트 자동화 (00:00~09:00 KST) ✅
- **문제**: 자정~09:00 KST 경계 시나리오 회귀 테스트 부재
- **해결**:
  - `tests/test_streak_midnight_boundary.py` 신규 생성
    - `TestOperationalPlayDate`: 운영일 계산 테스트 (6 cases)
    - `TestStreakMidnightBoundary`: 스트릭 자정 경계 테스트 (3 cases)
    - `TestMissionResetBoundary`: 미션 리셋 경계 테스트 (2 cases)
    - `TestClaimBoundary`: 클레임 경계 테스트 (2 cases)
    - `TestStreakServiceSmoke`: 스모크 테스트 (2 cases)
- **검증**: `pytest -k midnight tests/test_streak_midnight_boundary.py` - 15/15 통과

### F. 유저미션관리 닉네임 조회 ✅
- **문제**: 유저미션관리 화면이 유저 ID만 지원하여 닉네임 조회 불가
- **해결**:
  - `app/v2/api/admin/user_routes.py` 신규 - `GET /api/v2/admin/users/resolve?identifier=...`
    - nickname/ID/telegram_id/external_id(정확 일치)로 유저 식별
  - `src/v2/admin/pages/game/MissionManagerPage.tsx` 수정
    - 입력값이 문자열일 경우 닉네임 기반 조회 지원
- **검증**: 닉네임으로 유저 미션 조회 가능
- **업데이트**: 2026-01-26_닉네임조회_업데이트

### G. 팀배틀 어드민 프론트 연결 ✅
- **문제**: 팀배틀 어드민 페이지가 placeholder 상태로 API 연결 없음
- **해결**:
  - `src/v2/admin/pages/game/AdminTeamBattlePage.tsx` 신규
    - 시즌/팀 목록 조회, 시즌 생성, 팀 생성
    - 점수 조정, 멤버 강제 가입/탈퇴
  - `src/v2/api/adminApi.ts` 팀배틀 어드민 API 연동 추가
- **검증**: /admin/game/team-battle 화면에서 팀배틀 어드민 API 호출 성공
- **업데이트**: 2026-01-26_팀배틀어드민연결_업데이트

### H. V2 인박스 경로 수정 ✅
- **문제**: FE 인박스 API가 `/api/inbox`로 호출되어 404 발생
- **해결**:
  - `src/v2/api/inboxApi.ts` 수정
    - `/api/v2/inbox`, `/api/v2/inbox/read`로 경로 정정
- **검증**: 인박스 조회/읽음 처리 404 해소
- **업데이트**: 2026-01-26_인박스경로수정_업데이트

---

## [수정 파일 목록 - Mission 정책 (09~10)]

| 파일 | 변경 내용 |
|------|----------|
| `src/v2/router/V2UserRoutes.tsx` | `/v2/missions` canonical + `/missions` 리다이렉트 |
| `app/api/routes/mission.py` | 모든 엔드포인트 Deprecation 헤더 추가 |
| `app/v2/services/streak_service.py` | 신규 - StreakService 분리 |
| `tests/test_streak_midnight_boundary.py` | 신규 - 시간 경계 회귀 테스트 (15 cases) |

---

## [2026-01-26 구현 완료 항목] - Level 정책 구현 (07.level 가이드 기반)

### 07-1. Level SoT 검증 스크립트 ✅
- **문제**: DB 스키마/API 필드 정합성 자동 검증 없음
- **해결**:
  - `scripts/validate_level_sot.py` 신규 생성
    - `check_db_schema()`: `user_level_progress.xp` 컬럼 존재, `v2_user`에 XP 컬럼 부재 확인
    - `check_season_pass_null()`: Legacy API `season_pass` 필드 null 반환 확인
    - `check_cc_deposit_xp()`: CC Deposit 10만원당 20XP 적립 규칙 검증
    - `check_reward_table()`: 레벨 보상표(1~20) 정합성 검증
- **검증**: `python scripts/validate_level_sot.py --check all`

### 07-2. Season Pass Dual Write 제거 ✅
- **문제**: `admin_cc_deposit_service.py`에서 `season_pass.add_bonus_xp`와 `level_xp.add_xp` 동시 호출 (Dual Write)
- **해결**:
  - `app/v2/services/admin_cc_deposit_service.py` 수정
    - `season_pass.add_bonus_xp()` 호출 제거
    - `level_xp.add_xp()` 단일 호출만 유지 (V2 단일 레벨 시스템)
    - 주석으로 Legacy 폐기 명시
- **검증**: CC Deposit 시 `user_xp_event_log`에만 XP 로그 적재

### 07-3. Legacy API season_pass null 반환 정책 준수 ✅
- **상태**: 코드 레벨 검증 완료
- **확인**: `RoulettePlayResponse.season_pass` 기본값 = `None` (스키마에서 확인)
- **정책**: V2에서 Season Pass 폐기, 모든 Legacy API는 `season_pass: null` 반환

---

## [2026-01-26 구현 완료 항목] - Team Battle 정책 구현 (04.team_battle 가이드 기반)

### 04-1. Team Battle SoT 검증 스크립트 ✅
- **문제**: 시즌/랭킹 정책 변경 시 DB/코드/프론트 동기화 자동화 부재
- **해결**:
  - `scripts/validate_team_battle_sot.py` 신규 생성
    - `check_v2_namespace()`: app/v2, src/v2 경로 내 team_battle 구현 확인
    - `check_season_data()`: 활성 시즌 데이터 정합성 검증
    - `check_active_season_integrity()`: 팀/멤버/점수 무결성 검증
    - `check_rollover_readiness()`: 시즌 롤오버 준비 상태 (7일 내 종료 알림)
- **검증**: `python scripts/validate_team_battle_sot.py --check all`

### 04-2. v2 네임스페이스 정합성 확인 ✅
- **상태**: 파일 시스템 검증 완료
- **확인**:
  - BE: `app/v2/services/team_battle_service.py`, `team_battle_admin_service.py` ✅
  - FE: `src/v2/pages/game/TeamBattlePage.tsx` ✅
  - Admin Routes: `app/v2/api/admin/team_battle_routes.py` ✅
- **주의**: Legacy `app/services/team_battle_service.py` 존재 (점진적 마이그레이션 중)

### 04-3. FE 라우팅 v2 canonical 적용 ✅
- **문제**: FE 라우팅이 `/team-battle`, `/level` 등 non-canonical 경로 사용
- **해결**:
  - `src/v2/router/V2UserRoutes.tsx` 수정
    - `/v2/team-battle` canonical + `/team-battle` 리다이렉트
    - `/v2/level` canonical + `/level` 리다이렉트
    - 레거시 경로 3주 유지 후 제거 (2026-02-16)
- **검증**: `/team-battle` 접속 시 `/v2/team-battle`로 리다이렉트

---

## [수정 파일 목록 - Level 정책 (07)]

| 파일 | 변경 내용 |
|------|----------|
| `scripts/validate_level_sot.py` | 신규 - Level SoT 정합성 검증 스크립트 |
| `app/v2/services/admin_cc_deposit_service.py` | Season Pass 로직 전체 제거 (Dual Write + TOP10 스탬프) |
| `app/services/level_xp_service.py` | 들여쓰기/메서드 배치 수정 |
| `tests/v2_tests/phase2_core/test_cc_deposit_logic.py` | Season Pass mock 제거 → V2LevelXPService mock 사용 |

---

## [수정 파일 목록 - Team Battle 정책 (04)]

| 파일 | 변경 내용 |
|------|----------|
| `scripts/validate_team_battle_sot.py` | 신규 - Team Battle SoT 검증 스크립트 |
| `src/v2/router/V2UserRoutes.tsx` | `/v2/team-battle`, `/v2/level` canonical + 리다이렉트 |

---

## [수정 파일 목록 - Inventory 정책 (05)]

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/services/inventory_service.py` | `use_voucher()` benefits_suspended 체크 추가 |
| `scripts/validate_gifticon_naming.py` | 신규 - 기프티콘 네이밍 검증 스크립트 |

---

## [SoT 정합성 상태 - 2026-01-29]

```
✅ vault_balance = vault_locked_balance only (SoT 단일 출처)
✅ availableBalance = 0 (deprecated, FE에서 항상 0 반환)
✅ Admin API = /api/v2/admin/* (v2 표준 프리픽스)
✅ Withdrawals = /api/v2/admin/vault/withdrawals/* (canonical)
✅ 09:00 KST 리셋 = Admin/Mission/Vault 전 영역 통일
✅ Enum/Constants = v2_constants.py 중앙화 + SoT JSON 검증
✅ benefits_suspended = 상점 구매 + 바우처 사용 차단 (7일 무입금 유저)
✅ Empty Shop = Sentry 알림 연동
✅ 기프티콘 네이밍 = 검증 스크립트 제공
✅ FE 라우팅 = /v2/missions, /v2/team-battle, /v2/level canonical + legacy redirect
✅ Legacy API = Deprecation 헤더 적용 (Sunset: 2026-02-26)
✅ StreakService = MissionService에서 분리 완료
✅ 시간 경계 테스트 = 00:00~09:00 KST 회귀 테스트 15 cases
✅ Level DB 분리 = user_level_progress 테이블 사용 (v2_user에 XP 컬럼 없음)
✅ Season Pass Dual Write 제거 = level_xp.add_xp 단일 호출
✅ Legacy API season_pass = null 반환 (RoulettePlayResponse 스키마 확인)
✅ Team Battle v2 네임스페이스 = BE/FE 모두 v2 경로 사용
✅ 시즌 롤오버 검증 = 자동화 스크립트 제공 (validate_team_battle_sot.py)

[2026-01-29 추가]
✅ V2 Telegram Auth = 순수 V2 구현, V1 의존성 완전 제거
✅ Telegram hash 검증 = hmac.compare_digest 사용 (타이밍 공격 방지)
✅ V2 Access Token = 15분 만료 (v2_access_token_expire_minutes 분리)
✅ Refresh Token = 30일 만료, 7일 미만 시 sliding window 갱신
✅ Auth Event 로깅 = LOGIN_SUCCESS/FAILED, TOKEN_REFRESH, LOGOUT, RBAC_DENIED
✅ DEV 로그인 = dev_login_enabled 플래그 (기본값 False, PROD 안전)
✅ Admin RBAC 로깅 = RBAC_DENIED 이벤트 기록 (app/api/deps.py)
✅ Activity 경로 = /api/v2/activity/record 별칭 추가 (FE 호환)
```