# DiceService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.1
- 작성일: 2025-12-09
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- DICE Day에 유저와 시스템이 주사위를 굴려 승/무/패를 결정하고 보상을 반환하는 전 과정을 정의한다.

## 2. 범위 (Scope)
- 코드 경로: `backend/app/services/dice_service.py`와 관련 라우터/스키마/DB 테이블 책임을 다룬다.
- DB 컬럼/제약은 DB 문서(dice_config/log) 참고, API 계약은 `docs/03_api/` 참고.

## 3. 용어 정의 (Definitions)
- Daily Play Limit: config.max_daily_plays로 정의된 일일 플레이 한도. 운영 기간 동안 `0`은 무제한(sentinel)으로 취급하며 remaining은 0으로 응답하되 플레이를 차단하지 않는다.
- Outcome: WIN/DRAW/LOSE 중 하나로 승부 결과.
- Reward Mapping: 결과별로 config가 지정한 reward_type/reward_amount 매핑.

## 4. 책임 (Responsibilities)
- 오늘 feature_type=DICE인지, feature_config.is_enabled=1인지 확인하고 불일치/비활성 시 접근 차단(`NO_FEATURE_TODAY`).
- 활성 dice_config 로딩, 유저의 today_plays/remaining_plays 계산.
- play 시 유저/딜러 각각 2개씩 주사위 랜덤 생성 → 합계 비교로 승부 판단, 보상 결정, 로그 기록.
- SeasonPassService 연동을 통해 성공 시 스탬프/XP 업데이트(정책에 따라 적용).

## 5. 주요 메서드 시그니처

### 5-1. get_today_config
```python
def get_today_config(self, db, now, user_id: int) -> dict:
    """오늘 dice_config + today_plays/remaining_plays 정보를 반환한다."""
```
- today_plays: `dice_log` 기준 user_id+오늘 날짜 카운트.
- remaining_plays: max_daily_plays - today_plays (최소 0). max_daily_plays가 0이면 무제한으로 취급하고 remaining은 0으로 표시한다.

### 5-2. play
```python
def play(self, db, user_id: int, now) -> dict:
    """주사위 1회 대결 후 결과/보상/레벨 정보를 반환한다."""
```
- 단계:
  1) feature_type=DICE 여부, feature_config.is_enabled=1, config.is_active=1 확인. 스케줄 0/2건이면 `INVALID_FEATURE_SCHEDULE` 처리.
  2) today_plays < max_daily_plays 검증. (max_daily_plays=0 sentinel이면 제한 미적용)
  3) 유저/딜러 각각 2개씩 주사위 생성: user_dice_1/2, dealer_dice_1/2 (1~6).
  4) user_sum, dealer_sum을 계산해 WIN/DRAW/LOSE 판단 후 reward_type/reward_amount 매핑.
  5) RewardService 처리, dice_log(user_dice_1/2, dealer_dice_1/2, user_sum, dealer_sum, outcome) + user_event_log 기록.
  6) SeasonPassService.add_stamp() 호출 여부는 정책에 따름.
  7) game 결과(user_dice 배열, dealer_dice 배열, 합계, outcome) + 보상 + season_pass 블록 반환.

## 6. 데이터 연동
- 테이블: `dice_config`, `dice_log`, 공통 `user_event_log`.
- 인덱스: `INDEX(user_id, created_at)`로 일일 플레이 횟수 계산 최적화.
- config의 보상 정책(win/draw/lose)과 max_daily_plays를 운영자가 관리하도록 설계. (현재 max_daily_plays=0 sentinel로 무제한)

## 7. API 연동
- GET `/api/dice/status`: get_today_config 결과 전달.
- POST `/api/dice/play`: play 결과 반환, season_pass 블록은 add_stamp 호출 시 포함.

## 8. 예시 응답 (play)
```json
{
  "result": "OK",
  "game": {
    "user_dice": [5, 4],
    "dealer_dice": [3, 2],
    "user_sum": 9,
    "dealer_sum": 5,
    "outcome": "WIN",
    "reward_type": "POINT",
    "reward_amount": 10000
  },
  "season_pass": {
    "added_stamp": 1,
    "xp_added": 50,
    "current_xp": 250,
    "new_level": 4,
    "leveled_up": true
  }
}
```

## 9. 에러 코드
- `NO_FEATURE_TODAY`: 오늘 feature_type이 DICE가 아니거나 비활성화된 경우.
- `INVALID_FEATURE_SCHEDULE`: 동일 날짜 스케줄이 0개/2개 이상일 때.
- `INVALID_DICE_CONFIG`: 보상 매핑/active 상태 검증 실패 등 설정 오류(필요 시 사용).
- `DAILY_LIMIT_REACHED`: max_daily_plays 초과. (현재 max_daily_plays=0이라 발생하지 않음)

## 변경 이력
- v1.1 (2025-12-09, 시스템 설계팀)
  - max_daily_plays=0 sentinel 무제한 규칙, feature_config.is_enabled/INVALID_FEATURE_SCHEDULE 검증, 버전/작성일 정정
  - 유저/딜러 각 2개 주사위 합계 비교 구조로 확정하고 dice_log 필드/응답 예시/책임을 갱신
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 주사위 config/log, 승부/보상 로직, status/play 시그니처 정의
