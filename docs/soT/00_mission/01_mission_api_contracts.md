문서 타입: API 계약
버전: v1.3
작성일: 2026-02-14
작성자: GitHub Copilot
대상: BE/FE/기획
상태: Stable

## 1. 목적
V2 미션/스트릭 API 계약과 응답 스키마를 정의한다.

## 2. 범위
- 유저 미션 목록/진행도
- 미션 클레임
- 데일리 선물
- 스트릭 규칙/클레임
 - 어드민 미션 제어(요약)

## 3. 유저 API
### 3.1 미션 목록/진행도
- Endpoint: GET /api/v2/mission/
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
    "current_streak": 3,
    "current_multiplier": 1.2,
    "is_hot": false,
    "is_legend": false,
    "next_milestone": 7,
    "claimable_day": 3,
    "claimable_rewards": [3]
  }
}
```

### 3.1.1 응답 보강 규칙
- streak_info 누락 시 streak 객체를 대체로 허용
- claimable_day가 있으면 claimable_rewards에 동일 값을 포함 가능
- FE는 claimable_day를 우선 사용

### 3.1.2 미션 활성(is_active) 산정 규칙
- `is_active`는 단순한 `Mission.is_active` 플래그만 의미하지 않는다.
- 노출/진행/클레임 대상의 “활성” 판정은 **운영일(Asia/Seoul, 09:00 리셋)** 기준 날짜 및 `start_date/end_date` 기간 overlap, 그리고 필요 시 `start_time/end_time` 시간창까지 포함하여 판단한다.

### 3.2 미션 보상 수령
- Endpoint: POST /api/v2/mission/{mission_id}/claim

#### 3.2.1 성공 응답 예시
```json
{
  "success": true,
  "reward_type": "POINT",
  "reward_amount": 100
}
```

#### 3.2.1 예시 오류 응답
```json
{
  "detail": "NOT_ELIGIBLE"
}
```

### 3.3 데일리 선물 수령
- Endpoint: POST /api/v2/mission/daily-gift

#### 3.3.1 성공 응답 예시
```json
{
  "success": true,
  "reward_type": "POINT",
  "reward_amount": 50
}
```

### 3.4 스트릭 규칙 조회
- Endpoint: GET /api/v2/mission/streak/rules

#### 3.4.1 응답 예시
```json
{
  "rules": [
    {"day": 3, "enabled": true, "grants": [{"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 100}]}
  ]
}
```

### 3.5 스트릭 보상 수령
- Endpoint: POST /api/v2/mission/streak/claim

#### 3.5.1 성공 응답 예시
```json
{
  "success": true,
  "claimed_day": 3
}
```

### 3.6 이벤트 상태 API (참조)
- Endpoint: GET /api/events/valentine-seol/status
- `missions`는 **현재 운영일(09:00 KST 리셋)** 기준으로 필터링된 이벤트 미션만 포함한다.

## 4. 어드민 API (요약)
- POST /api/v2/admin/game/missions/reset-user/{user_id}
- POST /api/v2/admin/streak-rewards/distribute-milestone-reward
- GET /api/v2/admin/users/{user_id}/missions
- GET /api/v2/admin/game/missions/login-verify

## 5. 오류 코드
- MISSION_NOT_FOUND
- ALREADY_CLAIMED
- NOT_ELIGIBLE
- APPROVAL_PENDING
- BENEFITS_SUSPENDED

## 6. 스트릭 스키마 유의사항
- FE는 claimable_day 기반으로 버튼 활성화 판단
- claimable_rewards는 서버가 다중 지급일을 반환할 수 있는 확장용 배열

## 7. 안정성/호환성 규칙
- API prefix는 /api/v2 고정
- 레거시 /api/mission 경로는 신규 기능에서 사용 금지
- 스키마 변경 시 FE/BE 동시 배포 필요

## 8. 참고 문서(아카이브)
- [docs/SOT/mission/archive/v2_mission_streak_api_contract_ko.md](docs/SOT/mission/archive/v2_mission_streak_api_contract_ko.md)
- [docs/SOT/mission/archive/20260204_streak_claim_button_not_showing.md](docs/SOT/mission/archive/20260204_streak_claim_button_not_showing.md)

## 9. 변경 이력
- v1.3 (2026-02-14, GitHub Copilot): 운영일 기반 활성 판정 규칙 및 이벤트 status(참조) 추가
- v1.2 (2026-02-07, GitHub Copilot): 주요 엔드포인트 응답 예시 추가
- v1.1 (2026-02-07, GitHub Copilot): 응답 보강 규칙 및 어드민 API 요약 추가
- v1.0 (2026-02-07, GitHub Copilot): 미션 API 계약 통합 정리
