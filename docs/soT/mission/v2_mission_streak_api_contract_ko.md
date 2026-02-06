문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

# V2 Mission & Streak API 계약

## 1. 목적 (Purpose)
미션/스트릭 관련 V2 API 계약을 정의한다.

## 2. 범위 (Scope)
- 미션 목록/진행도
- 미션 보상 수령
- 데일리 선물 수령
- 스트릭 규칙 조회
- 스트릭 보상 수령

## 3. API 계약 (Contract)
### 3.1 미션 목록/진행도
- Endpoint: `GET /api/v2/mission/`
- Response:
```json
{
  "missions": [
    {
      "mission": {
        "id": 1,
        "title": "Daily Play",
        "category": "DAILY",
        "logic_key": "PLAY_DICE",
        "target_value": 1,
        "reward_type": "POINT",
        "reward_amount": 100,
        "xp_reward": 0,
        "requires_approval": false,
        "auto_claim": false,
        "is_active": true
      },
      "progress": {
        "current_value": 1,
        "is_completed": true,
        "is_claimed": false,
        "approval_status": "NONE"
      }
    }
  ],
  "streak_info": {
    "streak_days": 3,
    "current_multiplier": 1.2,
    "is_hot": false,
    "is_legend": false,
    "next_milestone": 7,
    "claimable_day": 3
  }
}
```

### 3.2 미션 보상 수령
- Endpoint: `POST /api/v2/mission/{mission_id}/claim`

### 3.3 데일리 선물 수령
- Endpoint: `POST /api/v2/mission/daily-gift`

### 3.4 스트릭 규칙 조회
- Endpoint: `GET /api/v2/mission/streak/rules`

### 3.5 스트릭 보상 수령
- Endpoint: `POST /api/v2/mission/streak/claim`

## 4. 오류 규칙 (Errors)
- `MISSION_NOT_FOUND`
- `ALREADY_CLAIMED`
- `NOT_ELIGIBLE`

## 5. 근거 (Source)
- 미션 용어 SoT: [docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md](../02_game/v2_mission_glossary_sot_ko.md#L1)
- 출석 스트릭 SoT: [docs/v2_specs/02_game/v2_attendance_streak_logic_sot_ko.md](../02_game/v2_attendance_streak_logic_sot_ko.md#L1)

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
