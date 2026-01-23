# XMAS 지급/보상 시스템 v1→v2 이관 현황 맵핑 (2026-01-30 기준)

> **긴급:** 본 문서는 v1 서비스 활용으로 작성된 기존 상태를 모두 초기화(리셋)하고 **Full-stack 관찰(End-to-end Observability)** 방식으로 재검증하기 위해 업데이트되었습니다. 아래 '초기화 및 풀스택 관찰 계획'을 따라 각 항목을 재검증하고 증거(로그/트레이스/DB row/테스트 출력을) 문서화하세요. 모든 변경은 작은 PR(Plan → Patch → Verify → Ship)로 관리합니다.
>
> **중요(전수 초기화):** 이 문서의 기존 항목들(특히 `백엔드 플로우/DB 필드/실제테스트/API/운영로그`에 v1 근거가 남아 있는 행)은 전부 **초기화(관찰 필요)** 상태로 리셋되었습니다. 팀은 아래의 재검증 템플릿을 사용해 각 항목을 End-to-end로 관찰하고, 증거를 수집해 이 표를 업데이트해야 합니다.
>
> ### 재검증 템플릿 (각 항목별 적용)
> - 담당자: @<owner>
> - 시작일: YYYY-MM-DD
> - 환경: Docker compose 서비스, 데이터 시드(간단 설명), 프론트 개발 서버(필요 시)
> - 재현 커맨드(예):
>   - 로그인: `pytest -q tests/integration/test_login_flow.py` 또는 curl 요청 (샘플)
>   - 상점 구매(백엔드): `curl -X POST /api/v2/shop/purchase ...` (헤더/페이로드 포함)
>   - 게임 플레이(백엔드): `curl -X POST /api/v2/dice/play` 또는 테스트 스크립트
>   - 프론트 E2E: `npm run test:e2e` 또는 `npx cypress run` / `npx playwright test` 또는 수동(브라우저: `http://localhost:5173`)
> - 증거(수집 포인트): 요청/응답 스니펫, 관련 DB row before/after(SELECT), Redis keys, backend log snippet (타임스탬프 포함), 프론트 스크린샷, 브라우저 네트워크/콘솔 스냅샷, DOM/ARIA 체크
> - 성공 기준: Functional 행동 확인 + Architectural 증거(관련 라우트/서비스가 `app.v2` 네임스페이스로 동작) + Front: UI/UX 요소 노출·작동(콘솔 오류 없음) + 프론트 E2E 테스트 통과
> - 비고/후속: 문제 발견 시 티켓(예: `golden-v2-migration`) 생성
>
>### 초기화 및 풀스택 관찰(작업 절차 요약)
>1. 환경 준비
>   - `docker compose up -d --build`으로 전체 스택(backend/frontend/db/redis/nginx)을 실행
>   - `.env` 또는 로컬 config로 실제 유저 시나리오에 근접한 데이터를 로드
>2. 핵심 플로우 E2E 재현(예시)
>   - 로그인 → 홈 진입 → 상점 조회/구매 → 인벤토리 사용 → 게임 플레이(룰렛/주사위/복권) → 미션 클레임 → 금고/보상 확인
>3. 관찰 포인트
>   - API 요청/응답(헤더 포함), DB row 변경, Redis 키/값, 로그(backend/frontend), 트레이스(있으면)
>4. 증거 수집 및 기록
>   - 각 플로우별로 명령, 실행 시간, 요약 출력(또는 로그 스니펫)을 `docs/v2_specs/00_sot_meta/v2_verification_test_logs_YYYYMMDD.md`에 추가
>5. 성공 기준
>   - Functional: E2E 시나리오의 핵심 결과가 기대치와 일치(유효한 주문 id, 보상 적립 등)
>   - Architectural: 관련 라우트/서비스가 `app.v2` 네임스페이스(또는 v2 shim 위임)로 동작하고 `app.services` 직접 의존이 제거되었음을 증거로 확인
6. 산출물
  - 테스트 로그 스니펫 문서 링크 추가, 변경 이력 업데이트, 후속 티켓(예: Golden 이벤트 v2 이관) 등록

## 1. 전체 기능/플로우 맵핑 (이관상태 표기 없음)

다음 표는 각 도메인/기능의 현재 상태를 빠르게 확인할 수 있도록 정리한 초안입니다. 각 행은 재검증 템플릿을 사용해 증거(로그/DB/테스트)를 수집한 후 업데이트하세요.

| 도메인/기능 | 세부 항목/설명 | 백엔드 플로우 | DB 필드 | 프론트 구현 | 프론트 테스트 | 유저(프론트) 검증 | 실제테스트 | API/운영로그 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 가입/인증 | 회원가입 / 로그인 / 2FA | app.v2 (auth) | user_v2, user_auth_v2 | src/v2/pages/auth | tests/frontend/auth.spec.ts | 브라우저 로그인 시나리오 (스크린샷/콘솔) | tests/v2/test_auth_v2.py | /api/v2/auth/*, /api/v2/user/* |
| 대시보드 | 메인 / 요약 / 통계 | 미확인 | 미확인 | src/v2/pages/dashboard | tests/frontend/dashboard.spec.ts | 핵심 위젯 렌더/수치 노출 확인 | 미확인 | 미확인 |
| 게임진행 | 룰렛 / 주사위 / 복권 (골든아워 / 조각모음 포함) | app.v2 services (예: app/v2/services/v2_roulette_service.py 등) | v2_roulette, v2_dice, v2_lottery (확인 필요) | src/v2/pages/game, src/v2/components/game | tests/frontend/game_play.spec.ts | 게임 플레이 시나리오(스크린샷/네트워크) | tests/v2_tests/phase3_game/* | /api/v2/roulette/*, /api/v2/dice/*, /api/v2/lottery/* |
| 주사위 골든아워 | 골든아워 이벤트 (배율/설정) | app/v2/services/v2_dice_service.py, v2_event_service.py | v2_dice_config (enable_golden_hour, multiplier) | src/v2/components/GoldenHourTimer.tsx 등 | tests/frontend/golden_hour.spec.ts | 브라우저 스크린샷/배율 확인 | tests/v2_tests/phase3_game/test_dice_admin_integration.py | /api/v2/dice/*, /api/v2/event/* |
| 게임로직 | 룰 / 결과 / 보상 | app.v2 services | v2_* 테이블 (확인 필요) | src/v2/components/game_logic | tests/frontend/game_logic.spec.ts | 결과 화면/보상 UI 확인 | tests/v2_tests/phase3_game/* | /api/v2/* |
| 게임결과 | 결과 집계 / 노출 | app.v2 services | v2_* | src/v2/pages/result | tests/frontend/result.spec.ts | 결과 표시/내역 스크린샷 | tests/v2_tests/phase3_game/* | /api/v2/* |
| 상점 | 상품 조회 / 구매 / 교환 | 미확인 | 미확인 | src/v2/pages/shop, src/v2/components/shop | tests/frontend/shop.spec.ts | 결제/구매 플로우 UI 확인 (스크린샷/주문 id) | 미확인 | /api/v2/shop/* |
| 인벤토리 | 적립 / 사용 / 잔액 | app.v2 services / v2 인벤토리 서비스 | v2_inventory (확인 필요) | src/v2/pages/inventory | tests/frontend/inventory.spec.ts | 인벤토리 사용/잔액 반영 UI 확인 | tests/v2_tests/phase2_core/* | /api/v2/inventory/* |
| 유저 활동 로그 | 활동 / 이벤트 / 로그 | 미확인 | 미확인 | 미확인 | 미확인 |
| 골든프로젝트 | 특수 이벤트 / 골든아워 연계 | 미확인 | 미확인 | 미확인 | 미확인 |
| 세그먼트 | 유저 그룹 / 분류 | 미확인 | 미확인 | 미확인 | 미확인 |
| 메시지발송 | 알림 / DM / 푸시 | 미확인 | 미확인 | 미확인 | 미확인 |
| 설문조사 | 설문 / 피드백 | 미확인 | 미확인 | 미확인 | 미확인 |
| 미션 | 미션 / 보상 | app.v2/services/v2_mission_service.py | v2_mission_* | src/v2/pages/mission, src/v2/components/mission | tests/frontend/mission.spec.ts | 미션 UI/클레임 UX 확인 (스크린샷/테스트) | tests/v2_tests/phase2_core/* | /api/v2/mission/* |
| 연속스트릭 오류이슈 | 스트릭 / 보상 이상 케이스 | 재검증 필요 | 재검증 필요 | tests/* (재검증 필요) | 미확인 |
| 텔레그램 오류이슈 | 연동 / 해제 / 오류 | 미확인 | 미확인 | 미확인 | 미확인 |
| 이벤트 | 모달 / 팝업 / 설계관리 | app.v2/services/v2_event_service.py | v2_event_* | src/v2/components/modals, src/v2/pages/event | tests/frontend/event.spec.ts | 모달/노출 UX 확인 (스크린샷/네트워크) | tests/v2_tests/phase4_admin/* | /api/v2/event/* |
| cc입금/수동입력 | 입금 / 수동 처리 | app.v2/services/v2_admin_cc_service.py (확인 필요) | v2_cc_* | src/v2/pages/admin_cc | tests/frontend/admin_cc.spec.ts | 관리자 수동입력 UI 검증 | 미확인 | /api/v2/admin/cc/* |
| 레벨시스템 | 레벨 업 / 보상 | 미확인 | 미확인 | 미확인 | 미확인 |
| 운영계획/로그/마케팅 | 운영 / 로그 / 마케팅 | 미확인 | 미확인 | 미확인 | 미확인 |

---

## 2. 지급/보상 관련 v1→v2 이관 현황 (사실 근거 기반)

> 표는 현재 전수 초기화(관찰 필요) 상태를 반영한 초안입니다. 각 항목은 재검증 템플릿을 적용해 근거를 수집하고, "이관상태" 및 "근거"를 채워주세요.

| 지급/보상 항목 | v1 | v2 | 이관상태 | 백엔드 플로우 | DB 필드 | 실제테스트 | API/운영로그 | 근거(문서/코드/운영 등) | 변환값/특이사항 메모 |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |
| 티켓 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 깁콘 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 금고 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 코인 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 조각 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 금고 출금조건 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 금고 적립조건 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 금고 관리자수동조정 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 미션 보상 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 연속스트릭 보상 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 게임별 보상 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 상점 교환 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 인벤토리 적립/교환 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |
| 레벨업 보상 | O | O | 초기화(관찰 필요) | 미확인 | 미확인 | 미확인 | 미확인 |  |  |

> 각 항목별 이관상태는 실제 코드/DB/운영/문서 등 근거 확인 후 "완료/진행중/미완료/미확인"으로 표기, 근거/메모란에 상세 내용 작성

---

## 3. 변환값/특이사항 메모 테이블

| 항목(지급/보상) | 변환값/특이사항 메모 |
| --- | --- |
|  |  |
|  |  |
|  |  |

> 각 항목별 변환값/특이사항은 이 표에 자유롭게 추가/수정

