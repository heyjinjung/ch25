# 미션 프리셋 확장 업데이트 (20260127)

## 변경 개요
관리자가 **게임별 개별 미션** (주사위 N회, 룰렛 N회, 복권 N회)과 **다양한 미션 타입** (채널입장, CC입금, 연속 로그인 등)을 쉽게 생성할 수 있도록 시스템 확장

## 백엔드 변경

### 1. ACTION_TYPE_ALIASES 확장 (`app/v2/services/mission_service.py`)
```python
ACTION_TYPE_ALIASES = {
    "JOIN_CHANNEL": ["SUBSCRIBE_CHANNEL", "CHANNEL_JOIN", "JOIN_TELEGRAM_CHANNEL", "JOIN_CC_CHANNEL"],
    "SHARE_STORY": ["SHARE", "STORY_SHARE"],
    "PLAY_GAME": ["PLAY"],  # 공통 게임 플레이
    "PLAY_DICE": ["DICE_PLAY"],  # 주사위 개별
    "PLAY_ROULETTE": ["ROULETTE_PLAY"],  # 룰렛 개별
    "PLAY_LOTTERY": ["LOTTERY_PLAY"],  # 복권 개별
    "GOLDEN_HOUR_PLAY": ["GOLDEN_HOUR", "GOLDEN_HOUR_GAME"],
    "CC_DEPOSIT": ["DEPOSIT", "CC_INPUT"],
    "JOIN_TELEGRAM_CHANNEL": ["TELEGRAM_JOIN", "TG_CHANNEL_JOIN"],
    "JOIN_CC_CHANNEL": ["CC_CHANNEL_JOIN", "OFFICIAL_CHANNEL_JOIN"],
    "CONSECUTIVE_LOGIN": ["NEXT_DAY_LOGIN", "LOGIN_STREAK"],
}
```

### 2. 게임 서비스 개별 액션타입 호출
- `dice_service.py`: `update_progress("PLAY_GAME")` + `update_progress("PLAY_DICE")`
- `roulette_service.py`: `update_progress("PLAY_GAME")` + `update_progress("PLAY_ROULETTE")`
- `lottery_service.py`: `update_progress("PLAY_GAME")` + `update_progress("PLAY_LOTTERY")`

### 동작 방식
| 액션 타입 | 매칭되는 미션 타입 |
|----------|------------------|
| PLAY_GAME | PLAY_GAME 미션만 |
| PLAY_DICE | PLAY_DICE 미션만 |
| PLAY_ROULETTE | PLAY_ROULETTE 미션만 |
| PLAY_LOTTERY | PLAY_LOTTERY 미션만 |

**중요**: 주사위 플레이 시 `PLAY_GAME` + `PLAY_DICE` 둘 다 호출하므로:
- "일일 게임 5회" (PLAY_GAME) → 1 증가
- "일일 주사위 3회" (PLAY_DICE) → 1 증가

## 프론트엔드 변경

### 1. 프리셋 목록 확장 (`MissionManagerPage.tsx`)

#### DAILY 프리셋 (8개)
| 프리셋 | 액션타입 | 설명 |
|-------|---------|------|
| daily_play_generic | PLAY_GAME | 게임 플레이 (전체) |
| daily_play_dice | PLAY_DICE | 주사위 게임 |
| daily_play_roulette | PLAY_ROULETTE | 룰렛 게임 |
| daily_play_lottery | PLAY_LOTTERY | 복권 게임 |
| daily_golden_hour | GOLDEN_HOUR_PLAY | 골든아워 참가 |
| daily_shop_purchase | BUY_SHOP_ITEM | 상점 구매 |
| daily_login_gift | LOGIN | 출석 체크 |
| daily_cc_deposit | CC_DEPOSIT | CC 입금 |

#### WEEKLY 프리셋 (8개)
| 프리셋 | 액션타입 | 설명 |
|-------|---------|------|
| weekly_play_generic | PLAY_GAME | 게임 플레이 (전체) |
| weekly_play_dice | PLAY_DICE | 주사위 게임 |
| weekly_play_roulette | PLAY_ROULETTE | 룰렛 게임 |
| weekly_play_lottery | PLAY_LOTTERY | 복권 게임 |
| weekly_golden_hour | GOLDEN_HOUR_PLAY | 골든아워 참가 |
| weekly_shop_purchase | BUY_SHOP_ITEM | 상점 구매 |
| weekly_login_streak | LOGIN | 로그인 |
| weekly_cc_deposit | CC_DEPOSIT | CC 입금 |

#### NEW_USER 프리셋 (5개)
| 프리셋 | 액션타입 | 설명 |
|-------|---------|------|
| new_user_first_login | LOGIN | 첫 로그인 |
| new_user_first_game | PLAY_GAME | 첫 게임 플레이 |
| new_user_telegram_join | JOIN_TELEGRAM_CHANNEL | 텔레그램 채널 입장 |
| new_user_cc_channel_join | JOIN_CC_CHANNEL | CC 공식채널 입장 |
| new_user_next_day_login | CONSECUTIVE_LOGIN | 다음날 로그인 |

### 2. 프리셋 선택 시 자동 설정
- **카테고리**: 프리셋에 연결된 카테고리 자동 선택 (예: daily_play_dice → DAILY)
- **액션타입**: 프리셋에 연결된 액션타입 자동 선택
- **제목**: "일일 주사위 5회" 형태로 자동 생성
- **logicKey**: `DAILY_DAILY_PLAY_DICE_5` 형태로 자동 생성

## 테스트
- `tests/v2_tests/phase2_core/test_v2_mission_game_specific.py` 추가
- 7개 테스트 케이스 모두 통과

## 사용 예시
1. 어드민에서 "📅 일일 | 주사위 게임" 프리셋 선택
2. 목표값 5 입력 → 제목 "일일 주사위 5회", logicKey `DAILY_DAILY_PLAY_DICE_5` 자동 생성
3. 보상 설정 후 저장
4. 유저가 주사위 플레이 → PLAY_GAME + PLAY_DICE 호출 → 해당 미션 진행

## 주의사항
- PLAY_GAME과 PLAY_DICE는 **분리**되어 있음 (alias 아님)
- 게임 서비스가 둘 다 호출하므로, "일일 게임 5회" + "일일 주사위 3회" 미션이 동시에 존재해도 각각 진행됨
