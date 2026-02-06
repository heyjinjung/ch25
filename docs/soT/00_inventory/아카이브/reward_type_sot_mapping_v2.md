# v2 보상타입 SoT 및 운영 데이터 매핑

## 1. 목적
- 미션, 게임, 레벨보상 등 주요 도메인별 보상타입의 SoT(enum/상수/DB 컬럼) 정의와 실제 운영 데이터(정책 문서/DB 값) 간 매핑을 명확히 관리한다.
- 정책/코드/DB 간 값 불일치 시 enum/상수 정의를 SoT로 간주하며, 운영 데이터/정책 문서와의 동기화 기준을 제시한다.

## 2. SoT 기준 및 매핑 원칙
- **최상위 SoT**: 백엔드 코드 내 enum/상수 정의 (예: MissionRewardType, GameTokenType)
- **DB 컬럼 타입**: enum/상수와 동일한 값(String/Enum)으로 관리, 불일치 시 코드 기준으로 동기화
- **정책 문서/운영 데이터**: 정책 변경 시 반드시 SoT(enum/상수)와 동기화, 불일치 발견 시 코드 기준으로 수정
- **운영 데이터 매핑**: 실제 DB/운영 값이 SoT(enum/상수)와 다를 경우, 매핑표를 통해 관리 및 동기화 내역 기록

## 3. 도메인별 SoT 및 매핑 예시

### 3.1 미션 보상타입 (MissionRewardType)
- SoT(enum):
  - NONE, DIAMOND, GOLD_KEY, DIAMOND_KEY, CASH_UNLOCK, TICKET_BUNDLE, TICKET_ROULETTE, TICKET_LOTTERY, TICKET_DICE, POINT, GIFTICON_BAEMIN, GIFTICON_COMPOSE, CHICKEN_GIFTICON_5000, CHICKEN_GIFTICON_10000, STARBUCKS_GIFTICON_2000, STARBUCKS_GIFTICON_10000, PIZZA_GIFTICON_5000, PIZZA_GIFTICON_10000, GOOGLE_GIFTICON_5000, GOOGLE_GIFTICON_10000, CC_POINT, GAME_XP, TICKET, BUNDLE
- DB 컬럼: mission.reward_type (SAEnum(MissionRewardType))
- 정책 문서/운영 데이터 매핑:
 

### 3.2 게임 토큰타입 (GameTokenType)
- SoT(enum):
  - ROULETTE_TICKET, DICE_TICKET, LOTTERY_TICKET, GOLD_KEY_TICKET, DIAMOND_TICKET, GOLD_KEY_FRAGMENT, DIAMOND_FRAGMENT, TRIAL_TICKET, DIAMOND, (V1 호환) ROULETTE_COIN, DICE_TOKEN, GOLD_KEY, DIAMOND_KEY, DIAMOND_KEY_FRAGMENT, TRIAL_TOKEN, (퍼즐) PUZZLE_C, PUZZLE_C1, PUZZLE_C2, PUZZLE_J, PUZZLE_M
- DB 컬럼: game_wallet.token_type (SAEnum(GameTokenType))
- 정책 문서/운영 데이터 매핑:
  | 정책/운영 값 | SoT(enum) | 비고 |
  |-------------|-----------|------|
  | ROULETTE    | ROULETTE_TICKET | 정책/DB 값이 다를 경우 코드 기준으로 동기화 |
  | ...         | ...       |      |

### 3.3 레벨보상 (season_pass_level.reward_type 등)
- SoT: 정책/운영 데이터와 일치 필요(추가 enum화 권장)
- DB 컬럼: season_pass_level.reward_type (String), season_pass_reward_log.reward_type (String)
- 정책 문서/운영 데이터 매핑:
  | 정책/운영 값 | SoT(권장값) | 비고 |
  |-------------|------------|------|
  | XP          | XP         | 일치 |
  | POINT       | POINT      | 일치 |
  | ...         | ...        |      |

## 4. 관리 및 동기화 프로세스
- 정책/운영 데이터 변경 시, 반드시 enum/상수(SoT)와 동기화 여부를 검토한다.
- 불일치 발견 시, enum/상수(코드)를 기준으로 정책/DB/운영 값을 수정한다.
- 매핑표를 통해 과거 불일치 내역 및 동기화 이력을 관리한다.
- 신규 보상타입 추가 시, 반드시 enum/상수 → DB 컬럼 → 정책 문서 순으로 반영한다.

## 5. 참고
- SoT 정의 및 매핑표는 docs/v2_specs/01_core/flow_feature_mapping_v1_v2.md, app/models/mission.py, app/models/game_wallet.py 등에서 최신 상태로 관리한다.
- 정책/운영 데이터와 코드/DB 간 불일치 발견 시, 반드시 이 문서와 enum/상수 정의를 기준으로 동기화한다.
