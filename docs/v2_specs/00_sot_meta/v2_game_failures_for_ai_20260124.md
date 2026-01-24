문서 타입: 문제 보고 (AI 수정을 위한 정리)
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot

# 🎯 V2 게임 관련 장애 요약 (2026-01-24)

**요약:** 로컬에서 게임 대시보드 진입 시 3개 엔드포인트가 500/통신실패를 반환합니다. 이 문서는 재현 정보, 요청/응답 헤더, 우선 조사 항목, 가능한 원인 가설, 수리/검증 조건, 그리고 AI에게 넘길 수 있는 프롬프트 템플릿을 제공합니다.

---

## 1) 재현 단계 (간단) ✅
1. 개발모드: `test / 1234` 로 로그인 (개발모드 계정)
2. 게임 대시보드 진입: `/v2/game/dice`, `/v2/game/roulette`, `/v2/game/lottery`
3. 실패 확인: 브라우저 네트워크 탭에서 아래 요청 확인

## 2) 실패 엔드포인트 & 에러 (증거) ❌
- 3.1 주사위 상태
  - Request URL: GET http://localhost:3000/api/v2/dice/status
  - Status: 500 Internal Server Error
  - 요청 헤더(요약): Authorization: Bearer <token>, Accept: application/json

- 3.2 룰렛 상태
  - Request URL: GET http://localhost:3000/api/v2/roulette/status?ticket_type=ROULETTE_TICKET
  - Status: 500 Internal Server Error
  - 요청 헤더: Authorization: Bearer <token>

- 3.3 복권 상태
  - 로그: [V2Adapter] Failed to fetch lottery status — "AxiosError" null
  - 증상: 클라이언트에서 Axios 호출 실패(에러 핸들링 없음 또는 500 반환)

(위 요청의 전체 요청 헤더는 네트워크 스니펫에 수록되어 있음 — 브라우저 캡처 보관 권장)

## 3.1 추가: Admin 페이지 - 게임 설정 저장 실패 (관리자 UI)
- 증상 요약:
  - 룰렛: 관리자 UI에서 룰렛 설정은 정상 동작(저장/조회 OK)
  - 주사위: 관리자에서 주사위 설정 저장 시 **확률(probabilities)** 필드가 저장되지 않거나 적용되지 않음(서버 응답 200이지만 실제 적용 불가)
  - 복권: `POST /api/v2/admin/game/lottery/config/1/prize` 호출 시 **500 Internal Server Error** 발생 (AxiosError: ERR_BAD_RESPONSE)

- 복권 API 오류(요약)
  - Request URL: POST http://localhost:3000/api/v2/admin/game/lottery/config/1/prize
  - Payload: {"label":"새 보상","weight":100,"stock":null,"reward_type":"NONE","reward_amount":0,"is_active":true}
  - Client Error: AxiosError (message: "Request failed with status code 500", code: "ERR_BAD_RESPONSE")
  - Response: status=500, data: {error: {...}}, headers include access-control-allow-origin
  - Stack: client-side stack reference (assets JS) — 서버 에러로 bubble-up

- 주사위 설정 불일치(요약)
  - Request URL: PUT http://localhost:3000/api/v2/admin/game/dice/config/1
  - Response: 200 OK (서버는 성공 응답), 그러나 확률 필드가 DB에 반영되지 않음
  - 추정 원인: probability 필드의 파싱/포맷 변환 또는 매핑 로직 문제

### Admin 관련 추가 조사 체크리스트
- 서버 로그(backend)에서 lottery prize create 시의 full stack trace 확인, trace_id 캡처
- DB 제약/스키마 확인: `lottery_prize` 테이블 컬럼(특히 weight, reward_type, reward_amount, stock)
- 입력 유효성 검증: prize 생성 handler의 pydantic/schema 검증 여부 및 에러 메시지
- 확률 저장 로직: dice config의 확률 배열 직렬화/역직렬화 확인 (포맷 불일치 검사)
- 트랜잭션 경계: prize 생성/수정 시 트랜잭션 롤백 여부 및 관련 예외 로그
- 테스트: prize create/update 및 dice config save/load round-trip 테스트 추가

### 임시 완화(Hotfix) 제안
- 복권 API: 입력 validation error는 4xx로 명확히 응답하고, 서버 내부 예외 발생 시 상세 로그와 함께 500을 기록
- 주사위 확률: 서버가 처리할 수 없는 확률 포맷일 경우 400 Validation 응답을 반환하고, 변경을 적용하지 않음
- 프론트: 실패 시 사용자에게 명확한 에러 메시지 (예: "확률 포맷 오류: 배열 형식이어야 합니다") 표시

### AI 프롬프트 템플릿 (관리자 설정 문제 전용)
```
[Context]
- Repo: XMAS Event System (FastAPI + React/Vite)
- Branch: temp-merge2
- Issue: Admin game settings - lottery prize create returns 500; dice config probabilities not persisted
- Evidence: Browser AxiosError (ERR_BAD_RESPONSE), POST /api/v2/admin/game/lottery/config/1/prize (500), PUT /api/v2/admin/game/dice/config/1 (200 but probability not applied)

[Tasks for AI]
1) Propose minimal patch to lottery prize create handler: add validation, defensive try/catch, improved logging (trace_id) and clear 4xx messages for invalid payloads.
2) Propose minimal patch to dice config save logic: ensure probabilities are parsed and persisted; add round-trip test.
3) Provide unit/integration tests (pytest) and a short PR description with verification steps.

[Constraints]
- Keep changes localized to admin game config handlers and services; minimal diffs.
- Follow SoT: prefer explicit 4xx for validation errors; add tests to prevent regressions.
```

(내용을 문서에 추가하였습니다)

## 3) 초기 영향 범위 및 우선순위 ⚠️
- 영향: 게임 대시보드 진입 불가 → 사용자 플레이 불가(직접적인 UX/매출 영향)
- 우선순위: P0/P1 (빠른 복구 권장)

## 4) 권장 조사 체크리스트 🔎
- 환경 확인
  - 로컬 서비스 포트: 8000(백엔드), 3000(FE 프록시) 등 서비스 기동 상태 확인
  - 로그: `docker compose logs --tail 200 backend` 및 frontend 콘솔 로그
- API 직접 호출
  - curl 예:
    curl -v -H "Authorization: Bearer $(cat docs/v2_specs/00_sot_meta/artifacts/20260124/api/dev_shop_token.txt)" "http://localhost:8000/api/v2/dice/status"
- DB 확인
  - 관련 테이블 존재 및 스키마: `v2_dice_config`, `v2_roulette_config`, `v2_lottery_config`, `v2_users` 등
  - 최근 오류/예외 로그의 trace_id로 검색
- 코드 레이어(권장 파일)
  - BE: `app/api/routes/game.py` 또는 `app/services/game_*_service.py` (파일명은 프로젝트마다 다름 — grep: `dice`/`roulette`/`lottery`)
  - 통신 어댑터: `V2Adapter` 관련 코드(복권 에러에서 식별됨)
  - 인증/권한: 토큰 파싱/권한 검증 로직
- 테스트/재현
  - 백엔드 단위/통합 테스트 실행: pytest for game tests
  - 프론트에서 네트워크 요청 재시도 및 오류 케이스 캡처

## 5) 잠정 원인 가설 (TOP-3) 💡
1. 데이터 매핑/조회 실패(예: v2 user mapping missing)
   - 왜 그럴까: 주사위/룰렛/복권 상태 조회 시 사용자 레코드가 필요하지만 매핑 누락으로 500 반환
   - 확인 방법: `v2_users`에 해당 legacy_id 존재 여부, 서비스에서 예외 처리 여부
2. 게임 구성(세팅) 레코드 없음 또는 DB 쿼리 예외
   - 왜 그럴까: `v2_*_config` 테이블에 필수 row가 없어 쿼리에서 예외 발생
   - 확인 방법: SELECT * FROM v2_dice_config LIMIT 1; 관련 migration 적용 여부 확인
3. 외부 어댑터/HTTP 호출 불안정 (예: V2Adapter 내부 Axios 호출 코드에서 예외 미처리)
   - 왜 그럴까: 외부 서비스/내부 어댑터에서 예외를 캐치하지 않고 500으로 bubble up
   - 확인 방법: `V2Adapter` try/catch, timeout, error logging 확인

## 6) 수리 목표 (Acceptance Criteria) ✅
- 각 상태 엔드포인트 GET `/api/v2/{dice,roulette,lottery}/status`가 200 OK와 정의된 JSON 스키마를 반환한다.
- 프론트에서 게임 대시보드가 정상 로드되어 UI에 상태가 표시된다.
- 관련 단위/통합 테스트가 추가 또는 갱신되어 회귀 방지

## 6.1) 추가 수정 사항 (2026-01-24)
- 미션 생성 400 원인: `rewardType=VAULT` 및 프리미엄 티켓 타입 미매핑.
  - BE: `VAULT -> POINT`, `GOLD_KEY_TICKET -> GOLD_KEY`, `DIAMOND_TICKET -> DIAMOND_KEY` 매핑 추가.
  - 파일: [app/v2/api/admin/mission_routes.py](app/v2/api/admin/mission_routes.py)
- 어드민 미션 모달 경고: DialogContent `Description` 누락 경고 제거.
  - FE: DialogDescription 추가.
  - 파일: [src/v2/admin/pages/game/MissionManagerPage.tsx](src/v2/admin/pages/game/MissionManagerPage.tsx)

## 6.2) 미션 보상 타입 확장 (2026-01-24)
- NEW_USER 미션 보상에서 `GIFTICON_*` 사용 시 400 발생.
  - BE: `MissionRewardType`에 V2 기프티콘 타입 8종 추가 및 보상 지급 매핑 보완.
  - DB: mission.reward_type ENUM 확장 마이그레이션 추가.
  - 파일:
    - [app/models/mission.py](app/models/mission.py)
    - [app/v2/services/mission_service.py](app/v2/services/mission_service.py)
    - [alembic/versions/20260124_1500_add_mission_reward_gifticons_v2.py](alembic/versions/20260124_1500_add_mission_reward_gifticons_v2.py)

## 7) 제안되는 Fix Plan (간단) 🛠️
1. 재현 및 로그 수집: 에러 스택/trace_id 수집, failing request 재실행
2. 원인 파악: 위의 가설별로 코드 및 DB 점검
3. 핫픽스(예시): 사용자 매핑 누락 시 4xx 반환 또는 fallback 제공, 어댑터 예외를 5xx로 노출하기 전에 상세 로그/trace 남기기
4. 테스트 추가: 문제 시나리오의 단위/통합 테스트 추가
5. 배포: staging에서 smoke 확인 후 prod 배포

## 8) AI 프롬프트 템플릿 (복사해서 사용) 🤖
아래 템플릿을 AI(코드수정 요청)에 붙여넣으면 빠르게 수리안과 패치 코드를 제안받을 수 있습니다.

```
[Context]
- Repo: XMAS Event System (FastAPI + React/Vite + MySQL)
- Branch: temp-merge2
- File of interest: game related endpoints (dice/roulette/lottery)
- Evidence: 500 errors on `/api/v2/dice/status`, `/api/v2/roulette/status`, lottery AxiosError log
- Artifacts: docs/v2_specs/00_sot_meta/artifacts/20260124/api/*

[Tasks for AI]
1) Propose minimal patch(es) to fix 500 errors and add defensive logging. Keep changes minimal and target only necessary files.
2) Add unit/integration tests that reproduce the failure and validate the fix.
3) Provide a short PR description and test verification steps.

[Constraints]
- Follow project SoT: minimal diffs, no broad refactor.
- Preserve backward compatibility; prefer explicit 4xx for data issues.

[Deliverables]
- Files/lines to change (suggest exact files if possible)
- Patch (diff or code snippet)
- Tests to add (pytest names)
- How to run and verify locally (commands)
```

---

문서를 저장했습니다: `docs/v2_specs/00_sot_meta/v2_game_failures_for_ai_20260124.md` ✅

### 추가: Raw Console / Stack Snippets (Admin Mission)
- Accessibility warning (console):
  - index.mjs:309 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
- Mission create 400 (client-side traces):
  - adminApi.ts:902  POST http://localhost:3000/api/v2/admin/game/missions 400 (Bad Request)
  - Promise.then lse @ adminApi.ts:902
  - mutationFn @ useAdminGame.ts:40
  - await in execute y @ MissionManagerPage.tsx:68
  - client.ts:85  [v2Client] response error Mt {message: 'Request failed with status code 400', name: 'AxiosError', code: 'ERR_BAD_REQUEST', ...}
- Image-upload flow: observed image attach then request 400 (suspect multipart/form-data handling or missing field)

### Quick investigation checklist (Mission/Multi-part)
- Capture Network request (payload/body) for POST `/api/v2/admin/game/missions` (include headers Content-Type and form fields). Save HAR.
- Inspect server-side validation error for the 400 (backend logs). Look for structured `field_errors` message.
- Check multipart handling (starlette/FastAPI file upload code) and file size/format limits.
- Fix UI accessibility: add `description` / `aria-describedby` to `DialogContent` (component where mission form is rendered).
- Add FE validation for required fields and file size/type before sending.

원하시면 다음 작업을 진행합니다:
- (A) 위 템플릿으로 곧바로 AI(코드 제안자)에게 수정 요청을 생성
- (B) `verify_game_status.ps1` 재현 스크립트에 미션/이미지 업로드 케이스 추가 및 실행 → artifact 저장
- (C) 이 문서를 PR에 첨부하여 이슈로 등록

원하시는 작업(A/B/C 또는 조합)을 알려주세요. ✨