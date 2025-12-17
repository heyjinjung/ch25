2025-12-08: API/DB/코인 시스템/서비스/운영/체크리스트/overview/architecture 최신화 반영. 실제 코드/운영/QA 흐름과 일치하도록 문서 업데이트.
# 프로젝트 변경 이력

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
