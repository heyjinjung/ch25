# V2 Full-Stack Observation Mapping (초안)

작성일: 2026-01-24
작성자: GitHub Copilot
상태: Draft

## 목적
남아 있는 V2 이관 작업 항목들에 대해 "Full-stack 관찰(End-to-end)" 시나리오를 정리하고, 각 항목별로 자동/수동 재현 커맨드, 수집해야 할 증거(로그/DB/Redis/스크린샷/네트워크), 성공 기준을 명확히 하여 진행도를 정량적으로 업데이트하도록 합니다.

---

## 사용법(요약)
- 각 행을 담당자가 실행하고 증거를 `docs/v2_specs/00_sot_meta/v2_verification_test_logs_YYYYMMDD.md`에 추가하세요.
- 파일명/스크린샷은 `<시나리오>_<YYYYMMDD_HHMMSS>.png` 형식으로 저장합니다.
- DB 스냅샷은 쿼리 및 결과(SELECT) 스니펫을 포함합니다.

---

## 증거 템플릿
- 실행자: @<owner>
- 시작일: YYYY-MM-DD
- 환경: local/staging/prod
- 재현 커맨드(백엔드): 예: `docker compose exec backend pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py`
- 재현 커맨드(프론트): 예: `npx cypress run --spec "cypress/e2e/game_play.spec.ts"`
- 수집 파일:
  - API 요청/응답 (curl 또는 Playwright/Cypress 네트워크 HAR)
  - DB row before/after (SELECT ...)
  - Redis keys (redis-cli GET/KEYS ...)
  - Backend logs (docker compose logs --tail 200 backend)
  - Frontend 스크린샷/콘솔/네트워크
- 성공 기준: Functional + Architectural + Front 검증(콘솔 오류 없음)
- 결과 요약(1줄): PASS/FAIL + 핵심 발견

---

## 전체 맵핑 표 (우선순위: High → Medium → Low)

| ID | 항목 | 우선순위 | 담당자 | 재현 시나리오(요약) | 백엔드 커맨드(예) | 프론트 커맨드(예) | 수집 증거 | 성공 기준 | 상태 |
|---|---|---:|---|---|---|---|---|---|---|
| 01 | SignUp → Shop → Play → Vault (Full Journey) | High | @owner | 신규 사용자 가입 → 상점 구매 → 인벤토리 사용 → 주사위 플레이 → 금고 적립 확인 | backend: `pytest -q tests/v2_tests/phase5_public/test_verify_full_scenario_v2.py`\ncurl: `POST /api/v2/dev/login`, `POST /api/v2/shop/purchase`, `POST /api/v2/dice/play` | frontend: `npx cypress run --spec "cypress/e2e/signup_shop_play.spec.ts"` | API req/resp 스니펫, DB SELECT user/vault/ledger, Redis keys, backend logs, 스크린샷(결제 확인/플레이 결과/금고 잔액) | 주문 ID가 생성되고 인벤토리 반영, play 결과가 v2_log에 기록, vault_locked_balance 변동이 증거로 남음 | passed (evidence: `artifacts/20260124/phase5_full_scenario_output.txt`, `artifacts/20260124/db_snapshots.md`) |
| 02 | Gambler's Loop (Lose All -> TicketZero -> Play Again) | High | @owner | 유저가 자산을 모두 소진 → TicketZero 요청 → 재지급 → 재플레이 | backend: `pytest -q tests/v2_tests/phase5_public/test_verify_full_scenario_v2.py` \ncurl: `POST /api/v2/vault/withdraw` | frontend: `npx playwright test tests/e2e/gambler_loop.spec.ts` | API req/resp, vault_withdrawal_request row, ticketzero log, backend logs, 스크린샷 | TicketZero 지급 후 vault balance 회복, 재플레이 성공 | passed (evidence: `artifacts/20260124/phase5_full_scenario_output.txt`, `artifacts/20260124/db_snapshots.md`) |
| 03 | Admin Intervention → Inbox → User Claim | High | @owner | 어드민에서 유저에게 재화/아이템 지급 → 유저 Inbox 확인 → 수령 및 잔액 반영 | backend: `pytest -q tests/v2_tests/phase4_admin/test_admin_intervention.py` \ncurl: `POST /api/v2/admin/messages` | frontend: `cypress: tests/e2e/admin_intervention.spec.ts` | Admin API req/resp, inbox DB row, user balance change, backend logs, 스크린샷(Inbox UI) | Inbox 적재 및 유저 수령 후 DB/화면 반영 | passed (evidence: `artifacts/20260124/test_results_20260124.md`) |
| 04 | Golden Hour (Dice) — 배수 적용 검증 | High | @owner | 골든아워 활성화 → 주사위 플레이(패배 보상 차감 포함) → 배수 적용 확인 | backend: `pytest -q tests/v2_tests/phase3_game/test_dice_golden_hour.py` \ncurl: `GET /api/events/status`, `POST /api/v2/dice/play` | frontend: `cypress: tests/e2e/golden_hour.spec.ts` | events status response, v2_dice_log row, user.vault_locked_balance before/after, request/response, screenshot | lose_reward_amount * multiplier가 ledger 및 vault에 반영(예: -50 * 2.0 = -100) | passed (evidence: `v2_verification_test_logs_20260124.md` case 3.12) |
| 05 | Game Play Smoke (Roulette/Dice/Lottery) | High | @owner | 각 게임 플레이 시나리오(승/무/패/티켓소모/배수/퍼즐드랍) | backend: `pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py` | frontend: `cypress: tests/e2e/game_play.spec.ts` | game logs, v2_{roulette,dice,lottery}_log rows, screenshots, network HAR | 모든 플레이에서 DB 로그/프론트 응답 일치, 중복 차감 없음 | passed (evidence: `artifacts/20260124/test_results_20260124.md`, `v2_verification_test_logs_20260124.md`) |
| 06 | Shop Purchase → Inventory Use → Idempotency | High | @owner | 상품 구매 후 인벤토리 적재 및 사용(동일 idempotency key 재전송 시 동일 응답) | backend: `pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py` \ncurl: `POST /api/v2/shop/purchase` | frontend: `cypress: tests/e2e/shop_purchase.spec.ts` | v2_shop_order row, user_game_wallet_ledger, idempotency key log, screenshots | 재시도 시 중복 결제 없음, inventory 수량 변동 반영 | passed (evidence: `artifacts/20260124/db_snapshots.md`, `artifacts/20260124/test_results_20260124.md`) |
| 07 | Vault Withdraw Flow (회차 제한 포함) | High | @owner | 출금 요청(10,000) 시 회차 제한/쿨다운/승인 생성 확인 | backend: `pytest -q tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py` \ncurl: `POST /api/v2/vault/withdraw` | frontend: `cypress: tests/e2e/vault_withdraw.spec.ts` | vault_withdrawal_request rows, audit log, backend logs, screenshot | 회차별 규칙 적용(또는 미적용 상태 명시) 및 PENDING/APPROVED 상태 기록 | passed (evidence: `artifacts/20260124/db_snapshots.md`, `v2_verification_test_logs_20260124.md`) |
| 08 | Mission Claim & Duplicate Issue (ALREADY_CLAIMED 재현) | Medium | @owner | 미션 클레임 1회 성공 후 동일 요청 시 ALREADY_CLAIMED 확인 및 로그 확보 | backend: `pytest -q tests/v2_tests/phase2_core/test_v2_mission_service.py` \ncurl: `POST /api/v2/mission/{id}/claim` | frontend: `cypress: tests/e2e/mission_claim.spec.ts` | mission_claim log, vault_ledger, response 400(ALREADY_CLAIMED), screenshot | 중복 요청 시 ALREADY_CLAIMED 발생(재현 로그 확보) | todo |
| 09 | Mixed Endpoints Cleanup Validation (Top10) | High | @owner | 혼재된 v1 참조 제거 확인 및 경로별 E2E 재검증 (Top10 목록 대상) | backend: `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` + 경로별 작은 통합 테스트 | frontend: 필요시 UI 시나리오 | import scan 결과, endpoint responses, backend logs, PR 링크 | 해당 경로가 v2-only로 동작하고 v1 import(경로)가 없음 | in-progress (arch scan passed; per-endpoint PRs pending) |
| 10 | Frontend Smoke: Dashboard / Shop / Inventory / Mission / Vault | Medium | @owner | 각 주요 페이지 로드/주요 위젯 렌더링 / 기본 UX 플로우 확인 | frontend: `npm run build && npx playwright test tests/e2e/smoke/*.spec.ts` | n/a | 스크린샷, 네트워크, console logs | 화면 렌더/데이터 바인딩 정상, 콘솔 오류 없음 | todo |
| 11 | Admin CC Deposit & XP Delta Logic | High | @owner | CC deposit idempotency & XP delta only -> XP 지급/레벨업 방지 검증 | backend: `pytest -q tests/v2_tests/phase2_core/test_cc_deposit_logic.py tests/v2_tests/phase2_core/test_xp_cap.py` | n/a | admin_cc_deposit rows, level_xp logs, backend logs | deposit_delta==0 일 때 XP 미지급, MAX_SAFE_DELTA 적용 검증 | passed (evidence: `v2_verification_test_logs_20260124.md` CASE 6.1/6.2) |
| 12 | TicketZero Flow & Cooldown | Medium | @owner | 티켓 제도(쿨다운/지급 제한) 동작 확인 | backend: `pytest -q tests/v2_tests/phase2_core/test_ticket_zero.py` | frontend: `cypress: tests/e2e/ticket_zero.spec.ts` | ticket_zero logs, vault changes, response bodies, screenshots | 티켓 지급 조건/쿨다운이 정책대로 작동 | todo |


---

## 실전 실행 가이드 (Runbook)
1. 환경 기동: `docker compose up -d --build backend db redis frontend nginx`
2. DB 마이그레이션: `docker compose exec backend alembic upgrade head`
3. 백엔드 단위/통합 실행: `docker compose exec backend pytest -q tests/v2_tests/<phase>`
4. 프론트 실행(로컬): `npm install && npm run dev` 또는 E2E: `npx cypress run` / `npx playwright test`
5. 증거 수집:
   - API: curl 또는 Playwright 네트워크 HAR
   - DB: `SELECT * FROM v2_* WHERE ...` (결과 스니펫 저장)
   - Logs: `docker compose logs --tail 200 backend` (타임스탬프 포함)
   - 스크린샷: 브라우저 캡처 저장(png)
6. 결과 기록: `docs/v2_specs/00_sot_meta/v2_verification_test_logs_YYYYMMDD.md`에 스니펫 추가

---

## 파일/증거 저장 규칙
- 로그 및 스크린샷 위치: `docs/v2_specs/00_sot_meta/artifacts/<YYYYMMDD>/`에 저장
- 테스트 실행 스냅샷 파일명 예: `20260124_signUp_shop_play_vault_api_response.json`, `20260124_signUp_shop_play_vault_screen1.png`
- 모든 증거는 PR 또는 이 문서의 '결과 링크' 칸에 추가

---

## 요청/다음 단계
- 승인하시면 저는 자동 시나리오 실행(Phase별 자동화 스크립트 실행 → 증거 수집)을 순차적으로 진행하고, 각 행의 `상태`와 `결과 링크`를 업데이트하겠습니다. 승인 여부를 알려주세요. 

---

(끝)
