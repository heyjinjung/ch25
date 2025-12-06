# XMAS 1Week Daily Feature & Season Pass System

크리스마스 7일 시즌패스 + 일간 이벤트(룰렛/주사위/복권/랭킹) 백엔드 프로젝트의 설계 문서 모음입니다. 모든 상세 설계는 `docs/` 하위에 규칙에 맞춰 분리되어 있습니다.

## 문서 맵
- `docs/01_overview/01_overview_system_v1.0.md`: 이벤트 기간, 활성화 정책, 핵심 플로우를 설명하는 총괄 개요.
- `docs/02_architecture/02_architecture_backend_v1.0.md`: FastAPI 백엔드 스택, 디렉터리 구조, 배포/운영 기준.
- `docs/03_api/03_api_overview_v1.0.md`: today-feature, 시즌패스, 룰렛/주사위/복권/랭킹 API 계약과 예시 응답.
- `docs/03_api/03_api_season_pass_v1.0.md`: 시즌패스 status/stamp/claim 엔드포인트 상세 계약.
- `docs/04_db/04_db_core_tables_v1.0.md`: 공통/시즌패스/게임 테이블 스키마 및 제약.
- `docs/04_db/04_db_season_pass_tables_v1.0.md`: 시즌패스 5개 테이블의 컬럼/제약/관계 상세 정의.
- `docs/05_modules/05_module_backend_services_v1.0.md`: 서비스/라우터/스키마 등 백엔드 모듈 책임 정리.
- `docs/05_modules/05_module_game_common_v1.0.md`: 룰렛/주사위/복권/랭킹 공통 규칙(활성화 검증, 로깅, 시즌패스 연동) 정리.
- `docs/05_modules/05_module_season_pass_service_v1.0.md`: SeasonPassService 책임과 add_stamp/claim 로직 세부 안내.
- `docs/05_modules/05_module_roulette_service_v1.0.md`: RouletteService status/play 흐름과 segment/보상 처리 정의.
- `docs/05_modules/05_module_dice_service_v1.0.md`: DiceService status/play 흐름과 승부/보상 처리 정의.
- `docs/05_modules/05_module_lottery_service_v1.0.md`: LotteryService status/play 흐름과 재고 기반 추첨/보상 처리 정의.
- `docs/05_modules/05_module_ranking_service_v1.0.md`: RankingService today 조회 흐름과 Top N/내 위치 응답 정의.
- `docs/06_ops/06_ops_runbook_v1.0.md`: 모니터링 지표, 장애 대응, 긴급 중단 절차.
- `docs/07_review/backend_validation_checklist_v1.0.md`: 설계 충족/보완 항목을 정리한 백엔드 검증 체크리스트.
- `docs/07_review/frontend_christmas_theme_review_v1.0.md`: 프론트엔드가 크리스마스 다크 카지노 톤을 충실히 따르는지 검증한 리포트.
- `docs/99_changelog/project_changelog.md`: 버전 및 변경 이력.

### 프론트엔드
- `docs/frontend/01_frontend_overview.md`: User/Admin SPA 개요, 자동 라우팅 흐름, 스택 요약.
- `docs/frontend/02_frontend_stack_spec.md`: React 18 + TS5 + Vite6 + Tailwind3 + Query v5 + Axios + RHF+Zod 버전/옵션 고정.
- `docs/frontend/03_frontend_architecture.md`: src 폴더 구조, 레이어 책임, 코드 스플릿/라우팅 흐름.
- `docs/frontend/04_frontend_routes_and_navigation.md`: User/Admin 라우트 테이블과 `/` → today-feature 리다이렉트 규칙.
- `docs/frontend/05_frontend_state_and_api_layer.md`: Axios 인스턴스 분리, React Query 옵션, 주요 데이터 훅 설계.
- `docs/frontend/06_frontend_ui_ux_guidelines.md`: 모바일 우선 UX, 로딩/에러/성공 패턴, Tailwind 기본 스타일.
- `docs/frontend/07_frontend_user_app_spec.md`: 유저 이벤트 페이지별 UI/데이터 흐름.
- `docs/frontend/08_frontend_admin_app_spec.md`: 관리자 화면 라우트, 폼/테이블 필드, Zod 검증 기준.
- `docs/frontend/09_frontend_components_and_style_system.md`: 공통 컴포넌트, Tailwind 토큰, 라이브러리 선택 기준.
- `docs/frontend/10_frontend_auth_and_security.md`: 토큰 저장, 보호 라우트, 401 처리, 민감정보 규칙.
- `docs/frontend/11_frontend_error_loading_patterns.md`: 로딩/에러/빈 상태 UI 패턴, 재시도 규칙.
- `docs/frontend/12_frontend_build_and_env.md`: Vite 빌드 옵션, 환경변수 키, 배포 산출물.
- `docs/frontend/13_frontend_testing_and_qc.md`: 필수 시나리오, 브라우저 범위, QC 체크리스트.
- `docs/frontend/14_frontend_validation_checklist.md`: 프론트 전역 설계 검증 체크리스트.

## 주요 원칙 요약
- 하루 하나의 Feature만 활성(Asia/Seoul 기준), 비활성 페이지는 "오늘은 이용 불가" 응답.
- 모든 게임/시즌패스 API는 JWT 인증 필요, 보상/결과 계산은 서버 전담.
- `/api/today-feature` < 200ms, 게임 API < 500ms(평균) 성능 목표.
- `feature_config.is_enabled` 플래그로 긴급 ON/OFF 지원, 로깅/모니터링 필수.
