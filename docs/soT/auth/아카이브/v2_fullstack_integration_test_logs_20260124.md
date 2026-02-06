문서 타입: 테스트 로그
버전: v1.5
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Test Logs (2026-01-24) ⚠️

**상태 레전드:** ✅ PASS / ❌ FAIL / ⏳ TODO

## 1. 목적 (Purpose)
V2 풀스택 연동 검증의 실행 결과와 증거를 단일 로그로 기록한다.

## 2. 환경 (Environment)
- 날짜: 2026-01-24
- 타임존: KST
- 실행자: @owner
- 환경: local/staging/prod (선택)

## 3. 실행 요약 (Summary)
| 구분 | 상태 | 세부 테스트 로그 링크 |
|---|---|---|
| **Auth Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_auth_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_auth_20260124.md) |
| **Game Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_game_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_game_20260124.md) |
| **Shop/Inventory Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_shop_inventory_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_shop_inventory_20260124.md) |
| **Vault Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_vault_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_vault_20260124.md) |
| **Mission Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_mission_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_mission_20260124.md) |
| **Admin Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_admin_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_admin_20260124.md) |
| **Public Area** | **PASS ✅** | [v2_fullstack_integration_test_logs_public_20260124.md](docs/v2_specs/00_sot_meta/v2_fullstack_integration_test_logs_public_20260124.md) |

## 4. 상세 로그
### 4.1 Backend
- 실행 커맨드:
```bash
pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py
pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py
pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py
pytest -q tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py
```
- 결과: PASS (test_game_engine_smoke.py)
- 증거: artifacts/20260124/backend/dice_smoke_output.txt
- 추가 로그: artifacts/20260124/backend/auth_token_500_backend_logs.txt

### 4.2 Frontend
- 실행 커맨드:
```bash
npx playwright test tests/e2e/smoke --reporter=list
npx cypress run --spec "cypress/e2e/admin_nav_smoke.cy.ts"
```
- 결과: PASS ✅ (v2_auth_dice_smoke.cy.ts)
- 증거: artifacts/20260124/frontend/cypress_auth_dice_output.txt
- 스크린샷: cypress/screenshots/v2_auth_dice_smoke.cy.ts/v2_auth_dice_smoke.png

## 5. 시나리오별 증거
| 시나리오 | 상태 | 증거 |
|---|---|---|
| SignUp → Shop → Play → Vault | todo ⏳ | artifacts/20260124/scenario/ |
| TicketZero → Play Again | todo ⏳ | artifacts/20260124/scenario/ |
| Admin Intervention → Inbox → User Claim | todo ⏳ | artifacts/20260124/scenario/ |
| Golden Hour Dice | todo ⏳ | artifacts/20260124/scenario/ |
| Mission Claim Duplicate | todo ⏳ | artifacts/20260124/scenario/ |

### 5.1 영역별 검증 기록 (범위 지정)
| 항목 | FE 라우팅 | API | 상태 | 증거 | 비고 |
|---|---|---|---|---|---|
| Auth | /landing | POST /api/v2/auth/token | passed ✅ | artifacts/20260124/api/auth_token_response_v2.json | 200 OK |
| Auth (DevLogin) | /landing | POST /api/v2/dev/login | passed ✅ | artifacts/20260124/api/dev_login_response_v2.json | v2 유저 생성/토큰 발급 |
| Game (Dice) | /game/dice | POST /api/v2/dice/play | passed ✅ | artifacts/20260124/api/dice_play_response_retry.json | 정상 응답 (LOSE/보상 반영) |
| Game (Roulette Status) | /game/roulette | GET /api/v2/roulette/status | passed ✅ | artifacts/20260124/api/roulette_status_response_v2.json | 200 OK |
| Game (Roulette Play) | /game/roulette | POST /api/v2/roulette/play | passed ✅ | artifacts/20260124/api/roulette_play_response_v2.json | 200 OK |
| Game (Lottery Status) | /game/lottery | GET /api/v2/lottery/status | passed ✅ | artifacts/20260124/api/lottery_status_response_v2.json | 200 OK |
| Game (Lottery Play) | /game/lottery | POST /api/v2/lottery/play | passed ✅ | artifacts/20260124/api/lottery_play_response_v2.json | 200 OK |
| Shop (Products) | /shop | GET /api/v2/shop/products | passed ✅ | artifacts/20260124/api/shop_products_response_v2.json | 200 OK |
| Shop (Purchase) | /shop | POST /api/v2/shop/purchase | passed ✅ | artifacts/20260124/api/shop_purchase_response_v2.json | 주문/인벤 반영 |
| Inventory (Use) | /inventory | POST /api/v2/inventory/use | passed ✅ | artifacts/20260124/api/inventory_use_response_v2.json | voucher 소모/토큰 지급 |
| Vault (Withdraw) | /vault | POST /api/v2/vault/withdraw | passed ✅ | artifacts/20260124/api/vault_withdraw_response_v2.json | 출금 요청 성공 |
| Mission (Daily) | /missions | POST /api/v2/mission/{id}/claim | passed ✅ | artifacts/20260124/api/mission_daily_claim_response_v2.json | X-Idempotency-Key 사용 |
| Mission (Weekly) | /missions | POST /api/v2/mission/{id}/claim | passed ✅ | artifacts/20260124/api/mission_weekly_claim_response_v2.json | X-Idempotency-Key 사용 |
| Survey (Active) | /surveys | GET /api/v2/surveys/active | passed ✅ | artifacts/20260124/api/survey_active_response_v2.json | v2 경로 호출 확인 |

## 6. 변경 이력
- v1.6 (2026-01-24, GitHub Copilot): Survey v2 경로 검증 증거 추가
- v1.5 (2026-01-24, GitHub Copilot): Public Area PASS 반영
- v1.4 (2026-01-24, GitHub Copilot): Vault/Mission PASS 반영
- v1.3 (2026-01-24, GitHub Copilot): Shop/Inventory PASS 반영
- v1.2 (2026-01-24, GitHub Copilot): Game Area PASS 반영
- v1.1 (2026-01-24, GitHub Copilot): Roulette/Lottery v2 오류 증거 추가
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
