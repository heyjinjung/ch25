# V2 게임 액션 스키마 (Game Action Schema SoT)

**문서 타입**: API 스키마 / 아키텍처 표준 / V2 SoT
**버전**: v2.0
**작성일**: 2026-01-18
**상태**: SoT (Source of Truth)
**프로젝트**: Golden V2

---

## 1. 목적 (Purpose)
- Golden V2의 모든 미니게임(룰렛, 주사위, 복권 등)의 플레이 요청/응답 구조를 통일합니다.
- V2 아키텍처(Redis Pub/Sub, Worker)와 호환되는 데이터 계약(Contract)을 정의합니다.

## 2. 공통 응답 구조 (Common Response Envelope)

모든 게임 플레이 응답(`PlayResponse`)은 아래 공통 필드를 포함해야 합니다.
**V2 변경점**: `vault_earn`의 적립 주체는 Worker이지만, API 응답에는 예측치 또는 즉시 반영된 값을 포함할 수 있습니다.

```json
{
  "result": "WIN",             // 결과 요약 (WIN / LOSE / DRAW)
  "game_data": { ... },        // 게임별 고유 결과 데이터 (하단 섹션 참조)
  
  // -- 사이드 이펙트 (보상 및 성장) --
  "vault_earn": 100,           // 이번 판으로 금고에 적립된 금액 (없으면 0)
  "season_pass": {             // 시즌패스 진행 상태 (변동 없으면 null 가능)
    "gained_xp": 10,
    "current_level": 5,
    "current_xp": 150,
    "level_up": false
  },
  "streak_info": {             // 스트릭(연속출석) 상태 (변동 없으면 null 가능)
     "current_streak": 3,
     "today_completed": true
  },
  
  // -- 신규 리텐션 필드 (Retention Hooks) - V2 Golden Core --
  "fever_gauge": {             // 피버/누적 게이지 상태 (Optional)
    "current": 80,
    "max": 100,
    "is_full": false
  },
  "next_action_available": [   // 이어서 할 수 있는 추가 액션 (Optional)
    "DOUBLE_UP",               // 예: 야수 모드 가능
    "RETRY_DISCOUNT"           // 예: 재시도 할인
  ]
}
```

---

## 3. 게임별 상세 스키마 (Game Specific Schemas)

### 3.1 룰렛 (Roulette)

**Action**: `POST /api/v2/game/roulette/spin`

#### Request
```json
{
  "ticket_type": "ROULETTE_TICKET", // 사용할 티켓 종류
  "bet_multiplier": 1             // 배수 (기본 1)
}
```

#### Response (`game_data` 내부)
```json
{
  "segment": {
    "id": 101,
    "label": "100 POINT",
    "reward_type": "POINT",
    "reward_amount": 100,
    "slot_index": 3,           // 휠에서의 위치 인덱스 (0~5)
    "is_fever_reward": false   // 피버 모드로 인한 특수 보상 여부
  },
  "animation_type": "NORMAL"   // 연출 타입: NORMAL, SLOW_DRAMA, FEVER_BLAST
}
```

---

### 3.2 주사위 (Dice)

**Action A**: `POST /api/v2/game/dice/roll` (기본 플레이)

#### Request
```json
{
  "bet_amount": 1,             // 토큰 개수
  "prediction": "HIGH"         // (Optional) 예측 값 (홀짝/높낮이 등 게임 룰에 따름)
}
```

#### Response (`game_data` 내부)
```json
{
  "user_dice": [4, 5],         // 유저 주사위 눈
  "dealer_dice": [2, 3],       // 딜러 주사위 눈 (VS 모드일 경우)
  "user_sum": 9,
  "dealer_sum": 5,
  "outcome": "WIN",            // 상세 승패 (WIN / LOSE / DRAW)
  "reward_amount": 200,        // 획득 보상량
  "can_double_up": true        // 야수 모드(Double Up) 진입 가능 여부
}
```

**Action B**: `POST /api/v2/game/dice/double-up` (야수 모드)

#### Request
```json
{
  "previous_game_id": "uuid...", // 직전 승리 게임 ID
  "choice": "EVEN"               // 선택지 (ODD/EVEN 등)
}
```

#### Response
```json
{
  "result": "WIN",
  "final_amount": 400,           // 2배된 최종 금액
  "is_bust": false               // 파산 여부
}
```

---

### 3.3 복권 (Lottery)

**Action**: `POST /api/v2/game/lottery/scratch` (구매 및 긁기)

#### Request
```json
{
  "ticket_type": "LOTTERY_TICKET",
  "selection_numbers": [1, 5, 9] // (Optional) 유저가 선택한 번호 (로또식일 경우)
}
```

#### Response (`game_data` 내부)
```json
{
  "prize": {
    "id": 505,
    "label": "5등 (꽝)",
    "reward_type": "NONE",
    "reward_amount": 0
  },
  "visual_grid": [               // 긁었을 때 나오는 시각적 데이터 (3x3 등)
    ["🍒", "🍋", "7️⃣"],
    ["꽝", "꽝", "🍒"],
    ["💎", "7️⃣", "🍋"]
  ],
  "collection_piece": "K"        // (신규) 컬렉션 퍼즐 조각 (없으면 null)
}
```

---

## 4. 데이터 타입 정의 (Data Types)

### RewardType (Enum)
- `POINT`: 금고포인트 적립
- `CC_POINT`: 외부 포인트 계열(금고포인트로 적립)
- `GAME_XP`: 레벨포인트 적립
- `DIAMOND`: 인벤토리 다이아
- `TICKET`: 만능티켓(티켓 종류는 `ticket_type` 필드로 구분)
- `BUNDLE`: 복합 지급(금고포인트 + 인벤토리)
- `TICKET_BUNDLE`: 티켓 묶음 지급
- `NONE`: 꽝(no-op)

**참고 문서**:
- [RewardType 표준 SoT](../01_core/v2_reward_type_standard_sot_ko.md)
- [보상 매핑 SoT](../01_core/v2_reward_mapping_sot_ko.md)

### AnimationType (Enum)
- `NORMAL`: 기본 속도
- `SKIP`: 즉시 결과 (자동 사냥 시)
- `DRAMATIC`: 뜸 들이기 (Squeeze)
- `FEVER`: 화려한 이펙트 (폭죽)

## 5. 에러 처리 (Error Handling)

HTTP 4xx/5xx 외에 비즈니스 로직 불가 시 `400 Bad Request`와 함께 아래 코드를 반환.

| Error Code | 설명 | 메시지 예시 |
| :--- | :--- | :--- |
| `NOT_ENOUGH_TOKEN` | 재화 부족 | "티켓이 부족합니다." |
| `DAILY_LIMIT_REACHED` | 일일 제한 초과 | "오늘 룰렛 횟수를 모두 사용했습니다." |
| `INVALID_BET` | 베팅값 오류 | "베팅 금액이 유효하지 않습니다." |
| `RATE_LIMITED` | 요청 과다 | "천천히 시도해주세요." (V2 Redis Rate Limiter) |

---

## 6. 변경 이력
- v2.0 (2026-01-18, GitHub Copilot): V2 스키마 이관 (Endpoint `/api/v2/` 로 변경, Metadata Update)
- v1.1 (2026-01-16): 기존 `2026_game_action_schema_ko.md`
