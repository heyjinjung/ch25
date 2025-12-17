# RouletteService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.2
- 작성일: 2025-12-09
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- ROULETTE Day에 유저가 룰렛을 1회 스핀하고 세그먼트 보상 결과를 받는 전 과정을 정의한다.

## 2. 범위 (Scope)
- 코드 경로: `backend/app/services/roulette_service.py`와 연계 라우터/스키마/DB 테이블에 대한 책임과 흐름을 다룬다.
- DB 테이블 상세는 DB 문서(roulette_config/segment/log) 참조, API 스펙은 `docs/03_api/` 참조.

## 3. 용어 정의 (Definitions)
- Segment: 룰렛 한 칸, 보상/확률 정보를 가진다. 한 config 당 slot_index 0~5로 고정 6개가 존재해야 한다.
- Weight Random: segment.weight 합을 기반으로 가중치 랜덤 추출.
- Daily Spin Limit: config.max_daily_spins로 정의된 유저 당 일일 스핀 한도. `0`은 무제한(sentinel)으로 취급하며 remaining은 0으로 응답하지만 차단하지 않는다.

## 5. 주요 메서드 시그니처

### 5-1. get_today_config
```python
def get_today_config(self, db, now, user_id: int) -> dict:
    """오늘 사용되는 roulette_config + today_spins/remaining_spins/segments를 반환한다."""
```
- today_spins: `roulette_log`에서 user_id와 오늘 날짜 기준 카운트.
- remaining_spins: max_daily_spins - today_spins (0 미만이면 0). max_daily_spins=0이면 무제한으로 간주하고 remaining은 0으로 표시한다.
- segments: slot_index/id/label/reward_type/reward_amount 리스트. slot_index 0~5 총 6개가 아니면 비정상 설정으로 간주하고 비활성 처리 또는 에러 응답.
- Σweight>0이 아닐 경우(모두 0) 비정상 설정으로 간주해 비활성 처리 또는 에러 응답.

### 5-2. play
```python
def play(self, db, user_id: int, now) -> dict:
    """1회 스핀 실행 후 결과/보상/레벨 데이터를 반환한다."""
```
- 단계:
  1) 오늘 feature_type=ROULETTE 여부, feature_config.is_enabled=1, config.is_active=1 검사. 스케줄이 0건/2건이면 `INVALID_FEATURE_SCHEDULE` 처리.
  2) slot_index 0~5로 정확히 6개 segment 존재 여부와 Σweight>0 검증(불일치 시 에러/비활성 처리).
  3) today_spins < max_daily_spins 확인. (max_daily_spins=0 sentinel이면 제한 미적용)
  4) segments 중 weight 기반 랜덤 선택.
  5) RewardService 처리 후 roulette_log + user_event_log 기록. slot_index도 로그 메타에 포함.
  6) SeasonPassService.add_stamp() 호출 여부는 비즈니스 정책에 따라 적용.
  7) 선택된 segment/보상/season_pass 결과 dict 반환.

## 6. 데이터 연동
- 테이블: `roulette_config`, `roulette_segment(slot_index 0~5)`, `roulette_log`, 공통 `user_event_log`.
- 인덱스: `INDEX(user_id, created_at)`로 일일 스핀 카운트 최적화.
- config.is_active=0인 경우 긴급 중단 처리, feature_config.is_enabled도 함께 검증.
- 설정 검증: config_id 당 roulette_segment가 정확히 6개이며 Σweight>0이어야 한다. 위반 시 상태 조회와 play 모두 비활성/에러 처리.

## 7. API 연동
- GET `/api/roulette/status`: get_today_config 결과를 그대로 전달 (UI용 segments 포함).
- POST `/api/roulette/play`: play 결과 반환, 레벨 블록은 add_stamp 호출 시 포함.

## 8. 예시 응답 (play)
```json
{
  "result": "OK",
  "segment": {
    "id": 12,
    "label": "룰렛코인1개",
    "reward_type": "TOKEN",
    "reward_amount": 1
  },
  "season_pass": {
    "added_stamp": 1,
    "xp_added": 50,
    "current_xp": 200,
    "new_level": 3,
    "leveled_up": true
  }
}
```

## 9. 에러 코드
- `NO_FEATURE_TODAY`: 오늘 feature_type이 ROULETTE가 아니거나 비활성화된 경우.
- `INVALID_FEATURE_SCHEDULE`: 날짜별 스케줄이 0개/2개 이상인 경우.
- `INVALID_ROULETTE_CONFIG`: segment 6칸 미만/초과, Σweight<=0, config 비활성 등 설정 오류.
- `DAILY_LIMIT_REACHED`: max_daily_spins 초과.

## 변경 이력
- v1.2 (2025-12-09, 시스템 설계팀)
  - max_daily_spins=0 sentinel 무제한 규칙, feature_config.is_enabled/INVALID_FEATURE_SCHEDULE 검증, 작성일 정정
- v1.1 (2025-12-08, 시스템 설계팀)
  - segment를 slot_index 0~5 총 6칸 고정 구조로 명시하고 Σweight>0, 세그먼트 개수 검증 로직을 책임에 추가
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 룰렛 config/segment/log 구조, status/play 흐름, 메서드 시그니처 정의
