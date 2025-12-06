# 공통 게임 모듈 가이드 (Roulette/Dice/Lottery/Ranking)

- 문서 타입: 모듈
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- 룰렛/주사위/복권/랭킹 모듈이 공통으로 따라야 할 활성화 검증, 로깅, 시즌패스 연동 규칙을 정의해 일관된 게임 경험을 제공한다.

## 2. 범위 (Scope)
- `backend/app/services/roulette_service.py`, `dice_service.py`, `lottery_service.py`, `ranking_service.py`에서 공유하는 정책과 데이터 개념을 다룬다.
- 게임별 세부 로직은 개별 모듈 기술서에서 다룬다.

## 3. 용어 정의 (Definitions)
- Feature: 오늘 활성화된 이벤트 타입(ROULETTE/DICE/LOTTERY/RANKING/SEASON_PASS).
- Today Feature Check: Asia/Seoul 기준 날짜로 `feature_schedule`/`feature_config`를 조회하여 오늘 사용 가능한 feature_type을 판정하는 절차.
- Game Log: 각 게임 전용 로그 테이블(*_log)과 공통 `user_event_log`에 남기는 기록.

## 4. 공통 규칙
- 모든 게임 API는 먼저 "오늘 feature_type이 맞는지"를 검사하고, 불일치 시 400/403으로 "오늘은 이용 불가" 응답을 반환한다.
- status/play(혹은 ranking 조회) 모두 JWT 인증 필수로 가정하고, 공통 라우터 미들웨어에서 인증을 적용한다.
- 모든 플레이/조회는 `user_event_log`에 event_name, feature_type, meta_json(결과/오류 이유 포함)으로 기록한다.
- 각 게임은 전용 설정 테이블(*_config)과 결과 로그(*_log 또는 ranking_daily)를 사용하고, 설정 활성화 플래그(is_active)를 통해 긴급 ON/OFF를 지원한다.
- SeasonPass 연동이 필요한 경우 성공 흐름에서 `SeasonPassService.add_stamp()`를 호출해 스탬프/XP/레벨업을 처리하고 응답에 `season_pass` 블록을 포함한다.

## 5. 공통 에러 코드/응답 규칙
- 표준 코드
  - `NO_FEATURE_TODAY`: 오늘 feature_type이 다르거나 비활성화된 경우.
  - `INVALID_FEATURE_SCHEDULE`: 날짜별 스케줄이 0개/2개 이상 등 비정상일 때.
  - `INVALID_<GAME>_CONFIG` (예: `INVALID_ROULETTE_CONFIG`, `INVALID_LOTTERY_CONFIG`): 필수 슬롯/가중치/재고 검증 실패.
  - `DAILY_LIMIT_REACHED`: max_daily_spins/plays/tickets 초과.
- 에러 응답 예시
```json
{
  "code": "INVALID_ROULETTE_CONFIG",
  "message": "segments must have 6 slots with total weight > 0"
}
```

## 6. 공통 데이터 개념
- *_config: 게임별 활성 여부, 일일 제한(max_daily_*), 보상/확률 등 정책을 관리한다.
- *_log: 유저별 플레이 결과, 보상 내역을 기록한다. 일일 제한 계산 시 user_id + 날짜 기준 카운트를 조회한다.
- 공통 인덱스 권장: `INDEX(user_id, created_at)`로 최근 플레이/횟수 조회를 최적화한다.

## 7. 공통 예시 (feature 불일치 응답)
```json
{
  "result": "UNAVAILABLE",
  "message": "오늘은 ROULETTE 이벤트가 아닙니다"
}
```

## 변경 이력
- v1.0 (2025-12-08, 시스템 설계팀)
  - 공통 활성화 검증, 로깅, 시즌패스 연동, 테이블 개념 정의
