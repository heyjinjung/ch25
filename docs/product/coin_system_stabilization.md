# Coin System Stabilization & Always-On Mode Plan

## 목표
- 로그인 → 홈에서 레벨/코인/게임 진입을 한 번에 확인하고 언제든 플레이 가능(테스트/검증 모드).
- today-feature 폐기 이후에도 동작하도록 안전한 기본 구조 확보(의존성 제거).
- 코인 기반 흐름이 FE-BE-DB 전역에서 일관되게 동기화되도록 점검 및 개선.

## 현재 파악된 구조
- 토큰 타입: `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET` (`src/types/gameTokens.ts`, `app/models/game_wallet.py`).
- 사용자 앱
  - 라우팅: `/login` → `/home`, 이후 `/roulette`, `/dice`, `/lottery`, `/season-pass`, `/ranking` (RequireAuth).
  - 홈: `useRouletteStatus`/`useDiceStatus`/`useLotteryStatus`로 코인 잔액 표시, 코인 없으면 버튼 비활성. status 쿼리 실패/404 시에도 카드 항상 렌더, 잔액 정보 로딩/실패 배지 표시
  - 게임 페이지: status 응답의 `token_balance`를 사용, 0 이하면 버튼 비활성. FeatureGate는 현재 children을 항상 렌더. today-feature 연동은 폐기되었으므로 경고 배너 제거.
- 관리자 앱
  - `/admin/game-tokens`: `grantGameTokens`로 코인 지급 폼 존재.
  - 기타 설정 페이지(룰렛/주사위/복권 설정, 시즌/스케줄 등) 이미 라우팅되어 있음.
- API 계층
  - `/roulette/status|play`, `/dice/status|play`, `/lottery/status|play`에서 `token_balance`, `token_type`을 내려받음. status 404/에러 시에도 홈 카드 항상 렌더, “잔액 정보를 불러오는 중/실패” 배지 표시
  - `/today-feature`는 폐기되어 기본 404/410. 남은 호출은 삭제하고 경고도 제거.
  - 레벨 `/season-pass/status|stamp|claim` 연동 존재.

## 문제점(관측/추정)
- 홈 카드 미노출: 과거 today-feature 404 이후 status 쿼리 에러로 섹션 미렌더 가능성이 있었음 → 잔여 호출 삭제 필요.
- 콘솔 경고: today-feature 호출 잔존으로 404/경고 반복.
- 코인 라벨/문구 인코딩 깨짐.
- 전역 동기화 가시성 부족: 로그인/플레이/레벨/코인 흐름을 수동 확인해야 함.
- 코인 정책(단위/소수점/마이너스 허용) 명문화 필요.

### 1) 프론트 즉시 조치 (항상 노출 + 안전 폴백)
- 홈: status 쿼리 실패/404 시에도 카드 3개 기본 렌더, “잔액 정보를 불러오는 중/실패” 배지 유지. today-feature 분기 제거 확인.
- 게임 페이지: FeatureGate 경고 제거 또는 축소, token_balance undefined/NaN 방어 재점검.
- 라벨/카피: `GAME_TOKEN_LABELS` 인코딩 복구, “코인 없음 → 관리자 문의” 문구 일관화.

### 2) 백엔드/스키마 정합성
- Status API: `token_type`, `token_balance` 필수 반환(미지급 시 0). today-feature 검증 플래그 삭제.
- Play API: 코인 차감/검증 로직은 today-feature와 무관하게 유지, `NOT_ENOUGH_TOKENS` 코드 유지. 로그에 `token_balance_before/after`, `token_delta` 확장 검토.
- 코인 지갑/지급: grant 엔드포인트/프로시저 스키마 명시(정수/소수/음수 허용 여부), 회수 대비 설계.

### 3) 전역 동기화/관측성
- README/RUNBOOK에 빠른 점검 SQL(코인 잔액/로그/레벨) 추가.
- FE 상태 배지: DB 연결/코인 상태 등 최소 헬스 배지 노출( today-feature 상태 항목 제거).

### 4) 단계별 롤아웃
1) 프론트 방어 렌더링/라벨 복구 → QA에서 홈 항상 노출 확인.
2) today-feature 호출/플래그 완전 제거 + status 필드 보장 → FE 폴백 코드 간소화 검증.
3) 코인 차감/지급 스키마 정리 + 관리자 UI에 로그 뷰/회수 버튼 추가.
4) 관측성: SQL 가이드 외에도 admin에서 최근 플레이/코인 로그 조회 탭 추가.

## 액션 아이템 요약
  - 홈 게임 카드 강제 렌더 + 에러 배지.
  - FeatureGate 경고 최소화, 라벨 한글 복구.
  - 토큰 데이터 undefined/NaN 방어 재점검.
  - status/play 경로에서 today-feature 체크/플래그가 남아 있으면 제거.
  - status 필드 보장, 코인 차감 로직 문서화.
  - 로그 스키마에 코인 변동치 추가(필요 시).
  - 컨테이너 소스 동기화 자동화 스크립트(scripts/rebuild_all.sh) 추가, 빌드/재시작 워크플로 명시.
  - 코인 정책(단위/마이너스 불가/정수) 명시.
  - README 점검 섹션에 코인 관련 SQL 추가.
  - admin에 코인/플레이 로그 뷰 계획 반영.

### 5) 컨테이너 소스 동기화 및 자동화
- today-feature는 폐기되어 404/410이 정상 상태. 과거 빌드 동기화 이슈는 무시 가능.
- Dockerfile.backend의 COPY 경로, WORKDIR, CMD, docker-compose.yml의 build context/volumes를 점검하여 소스 경로와 실행 경로가 일치함을 확인.
- 소스 변경 후 항상 최신 소스가 반영되도록 `scripts/rebuild_all.sh` 자동화 스크립트 추가 (docker compose build --no-cache + up -d).
- 개발 환경에서는 volume mount로 실시간 동기화 가능, 운영 환경에서는 빌드/재시작 워크플로 권장.
