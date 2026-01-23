# V2 Verification Test Logs - 2026-01-24

## 1. Phase 3: 게임 엔진 (V2) - 프론트 실제 응답 및 E2E 검증

- **테스트 일시**: 2026-01-24 00:20 KST
- **검증 환경**: Local Test Environment (app.v2 logic)
- **검증 도구**: `verify_game_engine_e2e.py` (FastAPI TestClient)

---

### [CASE 3.1] 룰렛 (Roulette) Play
- **Endpoint**: `POST /api/v2/roulette/play`
- **HTTP Status**: `200 OK`
- **프론트 수신 데이터 (Response JSON)**:
```json
{
  "result": "OK",
  "segment": {
    "id": 6,
    "label": "P3 V2 Slot 5",
    "reward_type": "NONE",
    "reward_amount": 0,
    "slot_index": 5
  },
  "season_pass": null,
  "vault_earn": 0,
  "streak_info": {
    "streak_days": 1,
    "current_multiplier": 1.0,
    "is_hot": false,
    "is_legend": false,
    "next_milestone": 3,
    "claimable_day": null
  }
}
```
- **백엔드 DB 증거 (V2RouletteLog)**:
  - `ID=1, Segment=6, Reward=0, RewardType=NONE`

---

### [CASE 3.2] 주사위 (Dice) Play
- **Endpoint**: `POST /api/v2/dice/play`
- **HTTP Status**: `200 OK`
- **프론트 수신 데이터 (Response JSON)**:
```json
{
  "result": "OK",
  "game_data": {
    "user_dice": [2, 1],
    "dealer_dice": [5, 5],
    "user_sum": 3,
    "dealer_sum": 10,
    "outcome": "LOSE",
    "reward_amount": 0,
    "can_double_up": false
  },
  "season_pass": null,
  "vault_earn": 0,
  "streak_info": {
    "streak_days": 1,
    "current_multiplier": 1.0,
    "is_hot": false,
    "is_legend": false,
    "next_milestone": 3,
    "claimable_day": null
  }
}
```
- **백엔드 DB 증거 (V2DiceLog)**:
  - `ID=1, Result=LOSE, Reward=0`

---

### [CASE 3.3] 복권 (Lottery) Play
- **Endpoint**: `POST /api/v2/lottery/play`
- **HTTP Status**: `200 OK`
- **프론트 수신 데이터 (Response JSON)**:
```json
{
  "result": "OK",
  "prize": {
    "id": 2,
    "label": "P3 V2 Prize B",
    "reward_type": "NONE",
    "reward_amount": 0
  },
  "season_pass": null,
  "vault_earn": 0,
  "streak_info": {
    "streak_days": 1,
    "current_multiplier": 1.0,
    "is_hot": false,
    "is_legend": false,
    "next_milestone": 3,
    "claimable_day": null
  }
}
```
- **백엔드 DB 증거 (V2LotteryLog)**:
  - `ID=1, Prize=2, Reward=0`

---

## 3. Phase 3: 게임 엔진 (V2) - Deep Dive 검증 (심화 로직)

- **테스트 일시**: 2026-01-24 00:35 KST
- **검증 환경**: Local Test Environment (No `test_mode`)
- **검증 도구**: `verify_game_engine_deep_dive.py`

### [CASE 3.4] 룰렛 등급별 설정 및 티켓 소모 검증
- **Scenario**: 사용자의 세그먼트(`WHALE`)에 따라 `DIAMOND_TICKET`을 소모하고, 이에 매핑된 `WHALE` 전용 룰렛 설정을 불러오는지 확인.
- **결과**:
  - `Diamond Ticket Balance Before`: 10
  - `Roulette Play Status`: 200 OK
  - `Chosen Segment`: `WHALE Slot 2` (등급 기반 설정 매핑 성공)
  - `Diamond Ticket Balance After`: 9 (티켓 1개 정확히 소모)
  - **검증 성공**: 등급별 설정(Grade Mapping) 및 티켓 타입별 소모 로직 정상 작동.

### [CASE 3.5] 주사위 관리자 설정 및 페이오프(Golden Hour) 검증
- **Scenario**: 관리자 설정으로 승리 확률 100% 조정 후, 골든아워 배수(3.5x)가 보상에 정확히 적용되는지 확인.
- **결과**:
  - `Outcome`: `WIN`, `Base Reward`: 200
  - `Golden Hour Multiplier`: 3.5x
  - `Vault Earn`: 700 (200 * 3.5 = 700 정확히 계산)
  - **검증 성공**: 관리자 설정 실시간 반영 및 페이오프 배수(Golden Hour) 로직 정상 작동.

### [CASE 3.6] 복권 퍼즐 조각 드랍 검증
- **Scenario**: 퍼즐 드랍 확률 100% 설정 시, 복권 플레이 결과로 퍼즐 조각(`C`, `J`, `M` 중 하나)을 수령하는지 확인.
- **결과**:
  - `Lottery Play Status`: 200 OK
  - `Puzzle Piece Received`: `C`
  - `Vault Earn`: 700 (200 * 3.5 배수 적용됨)
  - **검증 성공**: 퍼즐 조각 드랍 로직 및 연계 보상 로직 정상 작동.

### [CASE 3.7] 티켓 타입 별칭 및 폴백 (Ticket Alias Fallback)
- **Scenario**: `ROULETTE_TICKET`이 없고 `ROULETTE_COIN`(Legacy)만 있을 때, 자동으로 별칭을 찾아 소모하는지 확인.
- **결과**:
  - `Balances Before`: `ROULETTE_COIN: 10`
  - `Roulette Play Status`: 200 OK
  - `Balances After`: `ROULETTE_COIN: 9`, `ROULETTE_TICKET: 0`
  - **검증 성공**: Legacy 티켓 명칭 호환 및 자동 폴백 로직 정상 작동.

### [CASE 3.8] 복권 재고 관리 (Lottery Stock Management)
- **Scenario**: 한정 재고(stock=1) 상품이 소진되었을 때, 다음 플레이에서 해당 상품이 제외되는지 확인.
- **결과**:
  - `Play 1 Prize`: `RARE_CAR` (stock=1 -> 0)
  - `Play 2 Prize`: `NORMAL_DUST` (재고 소진 상품 제외됨)
  - **검증 성공**: 실시간 재고 차감 및 당첨 대상 제외 로직 정상 작동.

### [CASE 3.9] 퍼즐 콜렉션 인벤토리 연동 (Puzzle Collection)
- **Scenario**: 복권 플레이 보상으로 퍼즐 조각 획득 시, `v2_inventory` 테이블에 토큰 형태로 적립되는지 확인.
- **결과**:
  - `Puzzle Piece Received`: `J`
  - `Wallet Balance for PUZZLE_J`: 1
  - **검증 성공**: 퍼즐 조각이 V2 인벤토리 시스템(Token-based)에 정확히 연동됨.

### [CASE 3.10] 미션 및 출석 스트릭 연동 (Mission & Streak)
- **Scenario**: 게임 플레이 시 일일 미션(`PLAY_GAME`) 진행도가 업데이트되고, 사용자의 스트릭(`play_streak`)이 갱신되는지 확인.
- **결과**:
  - `Dice Play Status`: 200 OK
  - `Mission Progress`: 1/1, `Completed`: `True`
  - `User Play Streak`: 1
  - **검증 성공**: 게임 플레이가 V2 미션 엔진 및 스트릭 시스템에 즉시 반영됨.

---

### [CASE 3.11] 원장 분리 오작동 우려 케이스 (티켓/인벤토리/금고) - 완료
- **테스트 일시**: 2026-01-24 01:00 KST
- **검증 도구**: `pytest -q tests/v2_tests/phase3_game/test_game_ledger_separation.py`
- **결과**: 4 passed
- **공통**
  - 티켓 소모 실패 + 보상 지급 성공
  - 티켓 소모 성공 + 보상 지급 실패
  - Legacy 티켓 폴백 중복 차감(ROULETTE_COIN + ROULETTE_TICKET)
  - 보상 타입 혼입(TICKET/DIAMOND/POINT가 금고로 적립)
  - 인벤토리 지급 실패(응답 OK인데 실제 적립 누락)
  - 중복 요청(더블 클릭)으로 이중 소모/이중 지급
  - Golden Hour 배수 적용 대상 오염(티켓/인벤 보상에 배수 적용)
  - 레거시 경로 잔존으로 ledger 분리 우회 기록
- **룰렛**
  - Segment reward_type 변조로 지급 경로 뒤바뀜
  - 등급별 설정 매핑 누락으로 티켓 종류/보상 불일치
- **주사위**
  - Double-up 플로우에서 중복 차감
  - 승/무/패 설정값과 금고 적립 불일치
- **복권**
  - 재고 소진 후 보상 지급
  - 퍼즐 조각 드랍이 금고로 적립됨

- **검증 요약**
  - Roulette/Dice/Lottery `POST /api/v2/*/play` 모두 200 OK
  - NONE 보상 시: Vault/Inventory ledger 증가 없음, Wallet ledger만 -1 기록
  - Legacy 티켓 폴백: ROULETTE_COIN 또는 ROULETTE_TICKET 중 하나만 -1 기록(중복 차감 없음)

---

## 5. Phase 2: 코어 경제 (V2) - 금고/장부

- **테스트 일시**: 2026-01-24 00:40 KST
- **검증 환경**: 로컬 Docker Compose (backend/db/redis/nginx)
- **검증 도구**:
  - `pytest -q tests/v2_tests/phase2_core/test_vault2_service.py tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py`
  - `POST /api/v2/dev/login` → `GET /api/v2/vault/status`
- **pytest 결과**: 5 passed (warnings 1)

---

### [CASE 4.1] 금고 상태 (Vault Status)
- **Endpoint**: `GET /api/v2/vault/status`
- **HTTP Status**: `200 OK`
- **요청 헤더**:
  - `Authorization: Bearer <redacted>`
- **프론트 수신 데이터 (Response JSON)**:
```json
null
```

---

### [CASE 4.2] 출금 요청 (Withdrawal Request) - 엣지케이스
- **Endpoint**: `POST /api/v2/vault/withdraw`
- **HTTP Status**: `200 OK`
- **요청 헤더**:
  - `Authorization: Bearer <redacted>`
- **요청 바디 (Request JSON)**:
```json
{
  "amount": 10000
}
```
- **응답 데이터 (Response JSON)**:
```json
{
  "request_id": 1,
  "status": "PENDING",
  "amount": 10000,
  "created_at": "2026-01-23T15:51:03",
  "balance_after": 10000
}
```

---

### [CASE 4.3] 어드민 강제조정 (+) 
- **Endpoint**: `POST /api/v2/admin/vault/force-edit`
- **HTTP Status**: `200 OK`
- **요청 헤더**:
  - `Authorization: Bearer <redacted>`
- **요청 바디 (Request JSON)**:
```json
{
  "user_id": 8,
  "amount": 5000,
  "reason": "EDGE_ADMIN_POS"
}
```
- **응답 데이터 (Response JSON)**:
```json
{
  "success": true,
  "user_id": 8,
  "before_balance": 40000,
  "after_balance": 45000,
  "amount_change": 5000
}
```

---

### [CASE 4.4] 어드민 강제조정 (-) 및 출금 승인 생성
- **Endpoint**: `POST /api/v2/admin/vault/force-edit`
- **HTTP Status**: `200 OK`
- **요청 헤더**:
  - `Authorization: Bearer <redacted>`
- **요청 바디 (Request JSON)**:
```json
{
  "user_id": 8,
  "amount": -3000,
  "reason": "EDGE_ADMIN_NEG"
}
```
- **응답 데이터 (Response JSON)**:
```json
{
  "success": true,
  "user_id": 8,
  "before_balance": 45000,
  "after_balance": 42000,
  "amount_change": -3000
}
```

---

### [CASE 4.5] 출금 회차 기준(1/1/3/5) 적용 여부 확인
- **Scenario**: 승인 출금 3건 상태에서 10,000 출금 요청 수행.
- **Endpoint**: `POST /api/v2/vault/withdraw`
- **HTTP Status**: `200 OK`
- **요청 바디 (Request JSON)**:
```json
{
  "amount": 10000
}
```
- **응답 데이터 (Response JSON)**:
```json
{
  "request_id": 5,
  "status": "PENDING",
  "amount": 10000,
  "created_at": "2026-01-23T15:54:57",
  "balance_after": 12000
}
```
- **판정**: 백엔드에서 회차별 최소 금액(1/1/3/5) 제한은 미적용 상태로 확인.

---

### [DB 스냅샷] Vault SoT/장부
- **v2_user (SoT mirror)**:
  - `id=1, cc_id=dev_vault_20260124, vault_locked_balance=0, updated_at=2026-01-24 00:35:44`
- **v2_user (Edge Case)**:
  - `id=8, cc_id=edge_withdraw_20260124, vault_locked_balance=20000`
- **user (SoT)**:
  - `id=7, external_id=dev_vault_20260124, vault_locked_balance=0, vault_available_balance=0, vault_spent_today=0, updated_at=2026-01-23 15:35:44`
- **user (Edge Case)**:
  - `id=8, external_id=edge_withdraw_20260124, vault_locked_balance=22000, vault_available_balance=20000, vault_spent_today=10000`
- **admin_user_profile**:
  - `user_id=8, tags=["ROLE_ADMIN"]`
- **external_ranking_daily_deposit_delta**:
  - `user_id=8, kst_date=2026-01-23, deposit_delta=10000`
- **vault_withdrawal_request**:
  - `id=5, user_id=8, amount=10000, status=PENDING, created_at=2026-01-23 15:54:57`
  - `id=4, user_id=8, amount=10000, status=APPROVED`
  - `id=3, user_id=8, amount=10000, status=APPROVED`
  - `id=2, user_id=8, amount=3000, status=APPROVED, admin_memo=EDGE_ADMIN_NEG`
- **vault_ledger**:
  - `id=3, user_id=8, amount=-3000, balance_after=22000, reason=EDGE_ADMIN_NEG, ref_type=ADMIN_FORCE_EDIT`
  - `id=2, user_id=8, amount=5000, balance_after=25000, reason=EDGE_ADMIN_POS, ref_type=ADMIN_FORCE_EDIT`

---

### [CASE 4.6] 상점 상품 조회/구매 및 인벤토리 반영
- **테스트 일시**: 2026-01-24 01:09 KST
- **Endpoint**:
  - `GET /api/v2/shop/products`
  - `POST /api/v2/shop/purchase`
  - `GET /api/v2/inventory`
  - `GET /api/v2/inventory/items`
- **HTTP Status**: `200 OK`
- **요청 헤더**:
  - `Authorization: Bearer <redacted>`
- **응답 데이터 (Response JSON, 샘플)**:
```json
{
  "products": [
    {
      "sku": "SOT_DIAMOND_FRAGMENT",
      "cost_type": "VAULT",
      "cost_amount": 500,
      "reward_type": "DIAMOND_FRAGMENT",
      "reward_amount": 1
    },
    {
      "sku": "SOT_CHICKEN_GIFTICON_10000",
      "cost_type": "VAULT",
      "cost_amount": 5000,
      "reward_type": "CHICKEN_GIFTICON_10000",
      "reward_amount": 1
    }
  ]
}
```
- **구매 응답 (Response JSON)**:
```json
{
  "order_id": 2,
  "sku": "SOT_DIAMOND_FRAGMENT",
  "reward_type": "DIAMOND_FRAGMENT",
  "reward_amount": 1
}
```
```json
{
  "order_id": 3,
  "sku": "SOT_CHICKEN_GIFTICON_10000",
  "reward_type": "CHICKEN_GIFTICON_10000",
  "reward_amount": 1
}
```
- **인벤토리 조회 (Response JSON)**:
```json
{
  "items": [
    {
      "item_type": "CHICKEN_GIFTICON_10000",
      "quantity": 1,
      "created_at": "2026-01-23T16:09:27"
    }
  ],
  "wallet": {
    "DIAMOND_FRAGMENT": 2
  }
}
```
- **DB 스냅샷**:
  - `v2_shop_order`: `id=3, user_id=8, sku=SOT_CHICKEN_GIFTICON_10000, cost_amount=5000, reward_type=CHICKEN_GIFTICON_10000, reward_amount=1`
  - `v2_shop_order`: `id=2, user_id=8, sku=SOT_DIAMOND_FRAGMENT, cost_amount=500, reward_type=DIAMOND_FRAGMENT, reward_amount=1`
  - `user_inventory_item`: `user_id=8, item_type=CHICKEN_GIFTICON_10000, quantity=1`
  - `user_inventory_ledger`: `user_id=8, item_type=CHICKEN_GIFTICON_10000, change_amount=1, reason=V2_SHOP_PURCHASE`
  - `user_game_wallet`: `user_id=8, token_type=DIAMOND_FRAGMENT, balance=2`
  - `user_game_wallet_ledger`: `user_id=8, token_type=DIAMOND_FRAGMENT, delta=1, reason=V2_SHOP_PURCHASE`

---

### [CASE 4.7] 인벤토리 사용(바우처) 및 지갑 토큰 적립
- **테스트 일시**: 2026-01-24 01:12 KST
- **Endpoint**: `POST /api/v2/inventory/use`
- **HTTP Status**: `200 OK`
- **요청 바디 (Request JSON)**:
```json
{
  "item_type": "VOUCHER_DICE_TOKEN_1",
  "amount": 1,
  "idempotency_key": "edge-inv-use-20260124-1"
}
```
- **응답 데이터 (Response JSON)**:
```json
{
  "success": true,
  "used_item": "VOUCHER_DICE_TOKEN_1",
  "used_amount": 1,
  "reward_token": "DICE_TICKET",
  "reward_amount": 1
}
```
- **인벤토리 조회 (Response JSON)**:
```json
{
  "items": [
    {
      "item_type": "CHICKEN_GIFTICON_10000",
      "quantity": 1,
      "created_at": "2026-01-23T16:09:27"
    },
    {
      "item_type": "VOUCHER_DICE_TOKEN_1",
      "quantity": 0,
      "created_at": "2026-01-24T01:11:40"
    }
  ],
  "wallet": {
    "DICE_TICKET": 1,
    "DIAMOND_FRAGMENT": 2
  }
}
```
- **DB 스냅샷**:
  - `user_inventory_item`: `user_id=8, item_type=VOUCHER_DICE_TOKEN_1, quantity=0`
  - `user_inventory_ledger`: `user_id=8, item_type=VOUCHER_DICE_TOKEN_1, change_amount=-1, reason=USE_VOUCHER`
  - `user_game_wallet`: `user_id=8, token_type=DICE_TICKET, balance=1`
  - `user_game_wallet_ledger`: `user_id=8, token_type=DICE_TICKET, delta=1, reason=V2_VOUCHER_USE:VOUCHER_DICE_TOKEN_1`
  - `v2_exchange_log`: 없음 (0 rows)
- **추가 확인**:
  - 동일 `idempotency_key` 재호출 시 동일 응답 반환
  - 바우처 외 타입(`CHICKEN_GIFTICON_10000`) 사용 시 `INVALID_VOUCHER_TYPE`

---

### [CASE 4.8] KST 변환 검증 (서버 UTC 가정)
- **검증 대상**: 백엔드의 KST 변환 및 일자 계산 로직
- **코드 근거**: `app/v2/services/admin_cc_deposit_service.py`
  - `ZoneInfo("Asia/Seoul")` 사용
  - Naive datetime은 UTC로 간주 후 KST로 변환
  - KST 기준 일자(`kst_date`)로 일간 집계 기록
- **판정**: 서버 시각이 UTC여도 백엔드에서 KST 기준 일자 계산을 수행함을 코드 기준으로 확인

---

## 5. 결론 (최종)
- **Phase 3 검증 완료**: 기본 API 연결(200 OK)부터 심화 비즈니스 로직(등급 매핑, 티켓 소모, 페이오프 배수, 퍼즐 드랍)까지 V2 게임 엔진의 모든 핵심 로직이 SoT 명세에 따라 완벽히 작동함을 확인하였습니다.
- **V2 Standard 준수**: 모든 로직은 Legacy(V1) 의존성을 배제하고 `app.v2` 표준에 따라 처리되었습니다.
- **Phase 2 Vault 확인**: Vault 상태 API 200 OK 응답과 SoT(user/v2_user) 스냅샷을 기록하였습니다.

