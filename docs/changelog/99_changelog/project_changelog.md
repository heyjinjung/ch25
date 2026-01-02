2025-12-08: API/DB/코인 시스템/서비스/운영/체크리스트/overview/architecture 최신화 반영. 실제 코드/운영/QA 흐름과 일치하도록 문서 업데이트.
## 2026-01-01 (Vault Game Outcome Deduction & Mission API Fixes & Admin Stabilization)
- **Admin**: **[Critical Fix]** 팀 배틀 관리 페이지 500 에러 및 수정/삭제 불가 현상 해결.
  - 원인: 서버 DB `team` 테이블에 `icon`, `is_active`, `created_at`, `updated_at` 컬럼 누락.
  - 조치: 마이그레이션(`20260101_0405_add_team_columns.py`) 적용 및 서버 데이터 정합성(FK CASCADE) 검증 완료.
- **Pipeline**: **[New]** 스키마 동기화 검증 파이프라인 구축 (`scripts/check_migrations_sync.py`).
  - 모델 변경 후 마이그레이션 누락 시 배포 전단에서 감지하여 차단(Exit Code 1)하도록 안전장치 마련.
- **Vault**: 주사위/복권/룰렛 게임 결과에 따른 금고 잔액 차감(Penalty) 시스템 구축.
  - 주사위 패배 시 기본 -50원 차감 (`GAME_EARN_DICE_LOSE = -50`) 적용.
  - 복권/룰렛의 경우 당첨 상품 ID(`PRIZE_{id}`) 및 세그먼트 ID(`SEGMENT_{id}`)를 결과(Outcome)로 보고하여 어드민에서 개별 설정 가능하도록 고도화.
  - `Vault2Service`의 `DEFAULT_CONFIG`에 `game_earn_config` 구조를 추가하여 시스템 기본값으로 관리.
- **Mission**: `/api/mission` 경로 정규화 및 `NEW_USER` 카테고리 전역 통합 (Admin/User/Service).
- **Onboarding**: 레거시 onboarding 페이지(`/new-user/welcome`) 삭제 및 랜딩 페이지 내 웰컴 모달로 전환.
- **Testing**: `test_simulation.py` 내 금고 적립/차감(Deduction) 시나리오 업데이트 및 검증 완료.

## 2026-01-02 (Vault Single-SoT Phase 3: Stop cash_balance writes)
- **Vault**: 단일 SoT(`vault_locked_balance`) 기준으로 cash_balance 신규 write 차단을 확장.
  - 미션 `CASH_UNLOCK`: locked→cash 전환 제거, Vault2에 unlock 이벤트만 기록(관측/마이그레이션 준비용)
  - 입금/조건 해금(`VAULT_UNLOCK`): `handle_deposit_increase_signal()`에서 RewardService를 통한 cash 지급 중단
- **Migration**: 옵션 B(cash→locked 일괄 이관) 실행용 스크립트 추가 (`scripts/migrate_cash_balance_to_vault_locked.py`).
- Docs: 단계별 계획 문서(v1.3) 및 개발 로그 업데이트.

## 2026-01-02 (Welcome Modal Policy B: Show to all users until 4 missions completed)
- **Auth**: `/api/auth/token`에서 첫 로그인 시 `first_login_at` 세팅(온보딩 24h window 기준 안정화).
- **Onboarding**: `/api/new-user/status`의 `eligible` 대상자 게이트 제거(전 유저 status/미션 제공).
- **Frontend**: 웰컴 모달은 `eligible`이 아니라 “첫 4개 미션 완료” 기준으로만 자동 종료, 영구 숨김(localStorage) 제거.
- **Routing**: 운영에서 Telegram initData 없는 경우 `/login`으로 새는 경로를 줄이도록 `RequireAuth` 동작 조정.
- **Testing**: `pytest -q` 91 passed.

## 2026-01-02 (Ops: Launch promo plan 1/2~1/6)
- **Ops**: 배포 직후 유저 유치/홍보 운영 플랜(일자별 실행 + 카피 + KPI) 문서 추가.


# 프로젝트 변경 이력

## 2025-12-31 (Telegram-Only V3 Ready & Admin Revamp)
- DB: 2026 1/1 런칭 대비 전체 유저 및 게임 데이터 초기화 (`reset_db_v3.py`).
- Auth: 텔레그램 네이티브 전용 인증 시스템으로 완전 전환.
  - 외부 브라우저 접속 차단 및 프리미엄 안내 페이지(RequireAuth) 구현.
  - `/api/telegram/auth`를 통한 자동 가입/로그인 구조 단일화.
  - **[Refactor]** 유저 식별자 정책 변경: `Nickname` > `Telegram Username` > `External ID` 순으로 우선순위 부여.
  - **[Refactor]** 텔레그램 로그인 시 유저네임 기반 자동 계정 연동(Admin 선생성 계정 지원) 추가.
- Admin: 텔레그램 유저 구조에 맞춘 어드민 UI 전면 개편.
  - 회원 테이블에 `Telegram ID`, `Username` 직접 노출 및 편집 기능 추가.
  - 신규 회원 생성 시 유저네임 기반 닉네임 자동 폴백 로직 적용.
  - 매직 링크, 수동 연동, 비밀번호 초기화 등 불필요한 레거시 액션 제거.
  - 외부 PC 브라우저에서의 독립적인 어드민 접속 기능 유지 및 초기 계정 시딩(`seed_admin_v3.py`).
- API/Routing: **[Fix]** 404 에러 해결을 위한 전역 `/api` 중복 프리픽스 제거 및 경로 표준화.
  - 어드민 API를 `/admin/api/...`로, 유저 API를 `/api/...`로 프론트엔드 호출 규격에 맞춰 통일.
  - Health, Dev Auth 등 누락된 프리픽스 보완.
- Frontend: `App.tsx` 자동 인증 로직 최적화 및 고해상도 Skeleton 로딩 UI 적용.
- Scripts: `backfill_set_nicknames_from_telegram.py` 기능 고도화(일괄 강제 업데이트 `--force` 옵션 추가).

## 2025-12-30 (SSL/HTTPS & Telegram Integration Resolution)
- Infrastructure: `cc-jm.com` SSL/HTTPS 보정 (Nginx SSL 블록 추가 및 Let's Encrypt 인증서 적용).
- DB: 텔레그램 연동 대비 유저 스키마(`telegram_id`) 마이그레이션 적용 및 .env 파일 인코딩(UTF-16LE -> UTF-8) 정상화.
- Integration: 텔레그램 봇 토큰 업데이트 및 미니 앱 로그인/연동 라우팅(prefix `/api` 통일, `/v1` 제거) 해결.
- Frontend: `userMessageApi`, `telegramApi` 경로 리팩토링 및 배포 환경(502 Bad Gateway) 안정화.

## 2025-12-27 (Admin Branding & CRM Refinement)
- Branding: 전역 서비스명 "씨씨지민 코드지갑"으로 변경 및 UI 브랜딩 통합.
- CRM: 회원 관리 프로필 필드 확대(실명, 연락처, 태그 등) 및 데이터 정합성 강화.
- Ticket: 티켓 원장(Ledger) 카테고리 필터링(ADMIN, GAME, EXCHANGE) 기능 추가.
- Message: 메시지 센터 고도화(제목 검색, 페이징) 및 백엔드 연동.
- Marketing: 대시보드 지표 개선 및 세그먼트 상세 가시성 확보.

## 2025-12-26 (tests stabilization & deprecated features cleanup)
- Auth: 로그인 정책을 “DB에 유저가 존재할 때만 성공(자동 생성 금지)”으로 고정하고, 테스트를 해당 정책에 맞게 정리.
- Season pass: TEST_MODE 자동 시즌 생성 제거(시즌 없으면 404/None), 레벨 1 auto-claim 보상 로그 제외로 과다 로깅 방지.
- UI copy(ticket0): admin/public key 불일치로 운영 카피가 반영되지 않던 문제를 public read에서 신규 key 우선 조회 + 레거시 fallback으로 해결.
- Tests: 폐기된 기능 테스트 파일 정리 후 `pytest` 전체 통과 상태 확보.

## 2025-12-25 (season bridge doc pass)
- Docs: Overview/Architecture/API/DB/Ops를 시즌 브리지(7-key, 12/25~12/31→1/1 배치 지급)와 금고×체험티켓 경계(미구현 자동 해금, unlock_rules_json 카피) 기준으로 최신화.
- DB: user 임시 컬럼(event_key_count, event_pending_points) 및 season_pass_stamp_log.event_type=KEY_DAY_1~7 기록 요구사항 문서화.
- Ops: 1/1 배치 후 초기화/지급 검증 시나리오와 KEY_DAY_* 스탬프 로깅 체크 추가.

## 2025-12-11 (feature gate simplification & doc refresh)
- Backend: `/api/today-feature`를 공개 엔드포인트로 전환해 JWT 없이도 호출 가능하도록 수정, JWT가 있을 때만 `user_id`를 포함하며 응답 `feature_type`을 문자열로 일관화.
- Frontend: `FeatureType`에서 `NONE`을 제거하고 API 응답을 nullable로 정규화, `FeatureGate`/홈 카드가 null을 비활성 상태로 처리하며 폴백 데이터도 null 반환.
- Ops/Docs: TEST_MODE 명세서 추가 및 공통 게임 모듈 가이드를 v1.2로 정리(스케줄 정책/NONE 제외/스탬프 훅), API 개요 문서를 v1.2로 갱신해 today-feature 인증 옵션 변경을 반영.
- Tooling: 로컬 타입 오류 해소를 위해 `npm install` 실행(package-lock.json 업데이트), backend 빌드 시 `.env`에 `TEST_MODE=true` 적용 검증.

## 2025-12-07 (migration hardening & today-feature schema)
- DB: Alembic 체인을 정리(0004 헤더 정정)하고 `user_event_log` 정합성 마이그레이션(0005)을 `IF EXISTS/IF NOT EXISTS`로 안전·멱등하게 변경해 재적용 시 실패를 방지.
- API: `/api/today-feature` 테스트 클라이언트 호출 시 기본 `user_id=1`을 포함하도록 의존성을 보강해 스키마 검증 일관성 확보.
- Schema: `TodayFeatureResponse` 스키마 파일을 추가해 테스트에서 직접 검증할 수 있도록 정리.

## 2025-12-07 (game wallet tokens per feature)
- DB: `user_game_wallet` 테이블 추가(Alembic 0006) 및 3종 토큰 ENUM(ROULETTE_COIN, DICE_TOKEN, LOTTERY_TICKET) 도입.
- Backend: GameWalletService로 토큰 소모/지급/조회 API 추가, 각 게임 `/status`에 `token_type`/`token_balance` 노출, `/play` 진입 시 토큰 소모 및 부족 시 `NOT_ENOUGH_TOKENS` 에러.
- Admin: `/admin/api/game-tokens/grant` 엔드포인트로 토큰 지급 지원.
- Tests: 테스트 DB 부트스트랩 시 기본 토큰(각 10개) 시드해 기존 게임 시나리오가 통과하도록 정리.

## 2025-12-06 (runtime hardening & dev UX)
- Docker: MySQL 호스트 포트를 3307로 변경해 로컬 포트 충돌 해소.
- Docker: `public/` 디렉터리 누락으로 프론트 빌드 실패하던 이슈를 `.gitkeep` 추가로 해결.
- Backend: `PyJWT` 의존성을 추가해 컨테이너 기동 실패(`ModuleNotFoundError: jwt`) 해결.
- Backend: TEST_MODE에서 토큰 없이도 user_id=1로 통과하도록 `get_current_user_id` 완화, 프론트 로컬 호출 401 제거.
- Backend: `/api/today-feature` 응답이 Enum/None으로 검증 오류 나던 문제를 enum value 문자열 반환으로 수정하고, feature config 누락 시 404(`NO_FEATURE_TODAY`)로 정렬.
- Backend: Pydantic V2 스타일(`validation_alias`/`SettingsConfigDict`)로 env 로딩 경고 제거.

## 2025-12-06 (frontend gating)
- 프론트엔드 데모용 폴백 데이터를 기본 비활성화하고 `VITE_ENABLE_DEMO_FALLBACK` 플래그로만 동작하도록 변경
- `FeatureGate` 컴포넌트를 도입해 실서비스 모드에서는 오늘 설정된 단일 이벤트 외의 페이지 진입을 차단, 테스트 모드에서는 전체 기능 체험 허용
- 홈/레이아웃 헤더를 "지민코드 크리스마스 시즌 패스" 브랜딩과 당일 날짜 표기로 정비, 카드 리스트는 게이트 상태에 맞춰 활성/비활성 표시
- 백엔드 룰렛/주사위/복권의 일일 1회 제한을 제거하고 상태 응답에 무제한(sentinal) 남은 횟수를 반환하도록 수정

## 2025-12-06 (backend validation/tests refresh)
- Alembic 초기 리비전(20241206_0001) 로컬 적용 및 검증; stage/prod는 DATABASE_URL 수신 후 실행 예정
- 룰렛/복권/주사위 서비스 교차 검증(6칸·가중치합, 활성 가중치/재고, 주사위 값 범위)을 테스트로 추가
- 레벨 멀티 레벨업·수동 클레임·활성 시즌 없음 케이스를 통합 테스트에 반영
- 관리자 랭킹 업로드 성공/중복 랭크 충돌 테스트 추가
- API/문서에 max_daily=0 시 remaining=0을 "무제한"으로 표기하는 현행 정책 명시

## 2025-12-06
- FastAPI 커스텀 예외 핸들러 등록 방식을 예외별 `add_exception_handler`로 수정해 루트 500 오류 해소
- 모든 Pydantic 스키마의 `orm_mode`/`allow_population_by_field_name` 설정을 V2 키(`from_attributes`, `validate_by_name`)로 교체하여 실행 시 경고 제거
- 프론트엔드 의존성 설치 및 타입 오류 정리(react-query v5 `isPending`, Modal prop 일치, vite-env 타입 추가, dayjs 추가)
- PostCSS/Vite 빌드 에러 해소(`postcss.config.js` ESM 전환, CSS 주석 정리) 후 `npm run build` 성공
- Dockerfile.frontend 빌드 인자/ENV를 Vite 키(`VITE_API_URL`, `VITE_ADMIN_API_BASE_URL`, `VITE_ENV`)로 정리

## 2025-12-08
- XMAS 1Week 시스템 총괄 기술서 v1.0 작성
- 백엔드 아키텍처/모듈/API/DB/운영 문서 v1.0 추가
- 레벨 전용 API/DB/모듈 문서 추가, xp_earned/unique 제약 명시
- 룰렛/주사위/복권/랭킹 모듈 기술서 및 공통 게임 가이드 추가

## 2025-12-09
- 룰렛 6칸 고정(slot_index 0~5) 구조 및 Σweight>0 검증 요구사항을 DB/모듈 문서에 반영

## 2025-12-10
- 주사위 게임을 유저/딜러 2주사위 합계 비교 모델로 확정하고 DB/API/모듈 문서에 반영
- 복권 상품에 is_active를 추가하고 관리자 편집 범위(label/reward/weight/stock)를 명시, 가중치 합/재고 기반 추첨 규칙 문서화
- 랭킹 데이터를 관리자가 ranking_daily에 직접 입력하는 모델로 명확화하고 display_name 노출 규칙을 문서화
- 백엔드 설계 검증 체크리스트(v1.1)에서 공통 에러 코드, feature 스케줄/시즌 중복 처리, 일일 시나리오를 업데이트
- 프론트엔드 전용 문서 세트(개요/스택/아키텍처/라우트/상태/UX/유저·관리자 화면/컴포넌트/보안/에러/빌드/테스트/검증) 추가
- 크리스마스 시즌 UI/UX 가이드(v1.1)로 다크 카지노 톤, 타겟 적합성 체크리스트를 확정하고 유저 앱/검증 문서를 업데이트
- 프론트엔드 크리스마스 테마 검증 리포트(v1.0) 추가 및 전역 검증 체크리스트와 연동
