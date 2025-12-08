# Coin System Stabilization & Always-On Mode Plan

## 목표
- 로그인 → 홈에서 시즌패스/코인/게임 진입을 한 번에 확인하고 언제든 플레이 가능(테스트/검증 모드).
- today-feature/TEST_MODE 없이도 동작하도록 안전한 기본 구조 확보.
- 코인 기반 흐름이 FE-BE-DB 전역에서 일관되게 동기화되도록 점검 및 개선.

## 현재 파악된 구조
- 토큰 타입: `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET` (`src/types/gameTokens.ts`).
- 사용자 앱
  - 라우팅: `/login` → `/home`, 이후 `/roulette`, `/dice`, `/lottery`, `/season-pass`, `/ranking` (RequireAuth).
  - 홈: `useRouletteStatus`/`useDiceStatus`/`useLotteryStatus`로 코인 잔액 표시, 코인 없으면 버튼 비활성.
  - 게임 페이지: status 응답의 `token_balance`를 사용, 0 이하면 버튼 비활성. FeatureGate는 현재 children을 항상 렌더, today-feature 에러는 경고 배너만.
- 관리자 앱
  - `/admin/game-tokens`: `grantGameTokens`로 코인 지급 폼 존재.
  - 기타 설정 페이지(룰렛/주사위/복권 설정, 시즌/스케줄 등) 이미 라우팅되어 있음.
- API 계층
  - `/roulette/status|play`, `/dice/status|play`, `/lottery/status|play`에서 `token_balance`, `token_type`을 내려받음.
  - `/today-feature`는 404 시 null 로 폴백 처리(경고만).
  - 시즌패스 `/season-pass/status|stamp|claim` 연동 존재.

## 문제점(관측/추정)
- 홈에서 게임 카드가 안 보이는 사례 보고됨: today-feature 404 이후 status 쿼리 에러로 전체 섹션이 안 그려질 가능성, 또는 status 404 시 useQuery가 throw → 렌더 단에서 early return 로딩/에러 UI 없이 실패할 가능성.
- 코인 라벨/문구가 깨져 있음(인코딩 문제).
- today-feature 의존성이 완전히 제거되지 않아 404/에러 로그가 콘솔에 반복됨(경고는 남아 있음).
- 전역 동기화 가시성 부족: 로그인/플레이/시즌패스 스탬프가 DB에 제대로 쌓이는지 수동 확인 필요.
- 코인 잔액/차감/지급 흐름의 단위/정책이 명문화되어 있지 않음(소수점 여부, 마이너스 허용 여부, 트랜잭션 경계).

## 개선 계획

### 1) 프론트 즉시 조치 (항상 노출 + 안전 폴백)
- 홈
  - status 쿼리 실패/404 시에도 게임 카드 3개를 기본 렌더하고, “잔액 정보를 불러오는 중/실패” 배지를 표시하도록 방어 로직 추가.
  - today-feature 데이터와 무관하게 카드가 사라지지 않도록 별도 분기 제거/검증.
- 게임 페이지
  - FeatureGate 경고를 소형 토스트/배지로 축소, UI 공간 차지 최소화.
  - token_balance undefined/NaN 대비 방어(이미 일부 적용됨) 재점검.
- 라벨/카피
  - `GAME_TOKEN_LABELS` 한글 인코딩 복구.
  - 버튼/에러 메시지에서 “코인 없음 → 관리자에게 문의” 문구 일관화.

### 2) 백엔드/스키마 정합성
- Status API
  - 모든 게임 status에 `token_type`, `token_balance`를 필수 필드로 반환; 미지급 시 0 반환, 타입은 게임별 기본값.
  - today-feature 검증을 “이벤트 모드에서만” 수행하도록 플래그 분리(검증용 always-on 모드에서는 스킵).
- Play API
  - 코인 차감/검증 로직을 today-feature와 분리. 코인 부족 시 `NOT_ENOUGH_TOKENS` 코드 유지.
  - 로그 테이블(roulette_log/dice_log/lottery_log)에 `token_balance_before/after`, `token_delta` 필드를 포함하도록 확장(추가 필요 시).
- 코인 지갑/지급
  - grant endpoint가 사용하는 DB 테이블/프로시저 명세화(정수/소수 여부, 음수 허용 여부).
  - 관리자 지급/회수 공통 스키마 설계(향후 회수 기능 대비).

### 3) 전역 동기화/관측성
- README(또는 RUNBOOK)에 빠른 점검 섹션 추가
  - 로그인 후 user/로그 테이블 확인 SQL (already added) + 코인 잔액 조회 SQL.
  - 각 게임 플레이 후 대응 로그/시즌패스 로그 조회 SQL 예시.
  - 코인 지급 후 잔액/로그 확인 SQL 예시.
- FE에 최소 상태 배지 추가
  - 홈 상단에 “DB 연결/ today-feature 응답 상태/ 코인 상태” 간단한 헬스 배지 노출(추가 예정).

### 4) 단계별 롤아웃
1) 프론트 방어 렌더링/라벨 복구 → QA에서 홈 항상 노출 확인.
2) 백엔드 today-feature 의존 제거(플래그) + status 필드 보장 → FE의 폴백 코드 제거 가능 여부 검증.
3) 코인 차감/지급 스키마 정리 + 관리자 UI에 로그 뷰/회수 버튼 추가.
4) 관측성: SQL 가이드 외에도 admin에서 최근 플레이/코인 로그 조회용 탭 추가.

## 액션 아이템 요약
- FE
  - 홈 게임 카드 강제 렌더 + 에러 배지.
  - FeatureGate 경고 최소화, 라벨 한글 복구.
  - 토큰 데이터 undefined/NaN 방어 재점검.
- BE
  - status/play에서 today-feature 체크 토글 분리(검증 모드 off).
  - status 필드 보장, 코인 차감 로직 문서화.
  - 로그 스키마에 코인 변동치 추가(필요 시).
- 문서/운영
  - 코인 정책(단위/마이너스 불가/정수) 명시.
  - README 점검 섹션에 코인 관련 SQL 추가.
  - admin에 코인/플레이 로그 뷰 계획 반영.
