문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: V2 게임 API 설계/구현/검증 담당자
상태: Draft

## 1. 목적
V2 게임(룰렛/주사위/복권) 및 퍼즐 합체 제작 API의 요청/응답 스키마를 표준화한다.

## 2. 범위
- 룰렛: 상태 조회/플레이
- 주사위: 상태 조회/플레이
- 복권: 상태 조회/플레이
- 퍼즐 합체 제작: GOLD_KEY_TICKET 제작

## 3. SoT 우선순위
- V2 게임 엔진 SoT: docs/v2_specs/02_game/v2_game_engine_sot_ko.md
- 게임 액션 스키마 SoT: docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md
- 어드민 게임 설정 스키마 SoT: docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md
- 보상 타입 표준 SoT: docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
- 티켓 Enum 정합 SoT: docs/v2_specs/01_core/v2_ticket_enum_code_alignment_sot_ko.md

## 4. 룰렛 API
### 4.1 상태 조회
- `GET /api/v2/roulette/status`

**Query**
- `ticket_type` (옵션, 기본: `ROULETTE_TICKET`)

**Response**
```json
{
  "config_id": 1,
  "name": "기본 룰렛",
  "max_daily_spins": 0,
  "today_spins": 3,
  "remaining_spins": 0,
  "token_type": "ROULETTE_TICKET",
  "token_balance": 12,
  "segments": [
    { "id": 1, "label": "100 P", "reward_type": "POINT", "reward_amount": 100, "slot_index": 0 }
  ],
  "feature_type": "ROULETTE"
}
```

### 4.2 플레이
- `POST /api/v2/roulette/play`

**Request**
```json
{
  "ticket_type": "ROULETTE_TICKET",
  "bet_multiplier": 1
}
```

**Response**
```json
{
  "result": "WIN",
  "game_data": {
    "segment": {
      "id": 1,
      "label": "100 P",
      "reward_type": "POINT",
      "reward_amount": 100,
      "slot_index": 0,
      "is_fever_reward": false
    },
    "animation_type": "NORMAL"
  },
  "vault_earn": 100,
  "season_pass": null,
  "streak_info": null,
  "fever_gauge": null,
  "next_action_available": []
}
```

## 5. 주사위 API
### 5.1 상태 조회
- `GET /api/v2/dice/status`

**Response**
```json
{
  "config_id": 1,
  "name": "기본 주사위",
  "max_daily_plays": 0,
  "today_plays": 5,
  "remaining_plays": 0,
  "token_type": "DICE_TICKET",
  "token_balance": 7,
  "feature_type": "DICE",
  "event_active": false,
  "event_plays_done": null,
  "event_plays_max": null,
  "event_ineligible_reason": null
}
```

### 5.2 플레이
- `POST /api/v2/dice/play`

**Request**
```json
{
  "bet_amount": 1,
  "prediction": "HIGH"
}
```

**Response**
```json
{
  "result": "WIN",
  "game_data": {
    "user_dice": [3, 5],
    "dealer_dice": [2, 1],
    "user_sum": 8,
    "dealer_sum": 3,
    "outcome": "WIN",
    "reward_amount": 200,
    "can_double_up": true
  },
  "vault_earn": 200,
  "season_pass": null,
  "streak_info": null,
  "fever_gauge": null,
  "next_action_available": ["DOUBLE_UP"]
}
```

### 5.3 더블업
- `POST /api/v2/dice/double-up`

**Request**
```json
{
  "previous_game_id": "uuid...",
  "choice": "EVEN"
}
```

**Response**
```json
{
  "result": "WIN",
  "final_amount": 400,
  "is_bust": false
}
```

## 6. 복권 API
### 6.1 상태 조회
- `GET /api/v2/lottery/status`

**Response**
```json
{
  "config_id": 1,
  "name": "기본 복권",
  "max_daily_tickets": 0,
  "today_tickets": 2,
  "remaining_tickets": 0,
  "token_type": "LOTTERY_TICKET",
  "token_balance": 9,
  "prize_preview": [
    { "id": 1, "label": "100 P", "reward_type": "POINT", "reward_amount": 100 }
  ],
  "feature_type": "LOTTERY",
  "collection_progress": { "C1": 1, "C2": 0, "J": 0, "M": 0 }
}
```

### 6.2 플레이
- `POST /api/v2/lottery/play`

**Request**
```json
{
  "ticket_type": "LOTTERY_TICKET",
  "selection_numbers": [1, 5, 9]
}
```

**Response**
```json
{
  "result": "WIN",
  "game_data": {
    "prize": {
      "id": 1,
      "label": "100 P",
      "reward_type": "POINT",
      "reward_amount": 100
    },
    "visual_grid": [
      ["🍒", "🍋", "7️⃣"],
      ["꽝", "꽝", "🍒"],
      ["💎", "7️⃣", "🍋"]
    ],
    "collection_piece": "C1"
  },
  "vault_earn": 100,
  "season_pass": null,
  "streak_info": null,
  "fever_gauge": null,
  "next_action_available": []
}
```

## 7. 퍼즐 합체 제작 API
### 7.1 제작 요청
- `POST /api/v2/exchange/craft`

**Request**
```json
{
  "target_token_type": "GOLD_KEY_FROM_PUZZLE"
}
```

**Response**
```json
{
  "result": "OK",
  "reward_token": "GOLD_KEY_TICKET",
  "reward_amount": 1,
  "used_token": "PUZZLE_C_J_M",
  "used_amount": 0
}
```

## 8. 오류 규칙
HTTP 4xx/5xx 외에 비즈니스 로직 불가 시 `400 Bad Request`와 함께 아래 코드를 반환한다.

| Error Code | 설명 | 메시지 예시 |
| :--- | :--- | :--- |
| `INVALID_CONFIG` | 설정 미존재/불일치 | "설정이 유효하지 않습니다." |
| `NOT_ENOUGH_TOKENS` | 재화 부족 | "티켓이 부족합니다." |
| `DEPOSIT_REQUIRED` | 금고 정책 차단 | "입금 후 이용 가능합니다." |

## 9. 변경 이력
- v1.3 (2026-01-19, GitHub Copilot): Game Action Schema 응답/요청 구조로 동기화
- v1.2 (2026-01-19, GitHub Copilot): 오류 규칙 표준 표 형식으로 통일
- v1.1 (2026-01-19, GitHub Copilot): 티켓/토큰 표기 V2 문서 표준 Enum으로 통일
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
