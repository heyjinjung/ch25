# RouletteService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.3
- 작성일: 2025-12-25
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
- Roulette Coin: GameWallet의 `GameTokenType.ROULETTE_COIN`. 1회 스핀 시 반드시 1장 소모한다.

## 4. 책임 (Responsibilities)
- 오늘 feature_type=ROULETTE인지, feature_config.is_enabled=1인지 검증한다. config.is_active=1인 단일 레코드가 없으면 `ROULETTE_CONFIG_MISSING`(TEST_MODE면 기본 config/segment 시드).
- status에서 GameWallet 잔액을 조회하고, 당일 스핀 카운트(today_spins)와 segment 리스트를 반환한다. 일일 한도는 제거되어 remaining_spins는 항상 0(무제한 표기)로 응답한다.
- play에서 slot_index 0~5 정확히 6개, weight>=0, Σweight>0 검증 후 가중치 랜덤 추첨.
- play 실행 시 `ROULETTE_COIN` 1장을 강제 차감, RewardService 지급, RouletteLog 기록, game_play 로그 작성.
- reward_amount>0일 때만 SeasonPassService.maybe_add_internal_win_stamp(내부 승리 50회 보상) 시도. 게임 1회당 자동 도장 부여(add_stamp)는 비활성화되어 season_pass 응답은 None.

## 5. 주요 메서드 시그니처

### 5-1. get_status
```python
def get_status(self, db, user_id: int, today: date) -> RouletteStatusResponse:
  """오늘 roulette_config + today_spins + segments + 지갑 잔액을 반환한다."""
```
- today_spins: `roulette_log`에서 user_id와 오늘 날짜 기준 카운트(모니터링용, 제한 없음).
- remaining_spins: 항상 0(무제한 표기, 차단 로직 없음).
- segments: slot_index 0~5 정확히 6개, weight>=0, Σweight>0 필수. TEST_MODE에서는 미존재 시 기본 세그먼트 6개를 자동 시드.
- token_balance: GameWallet의 ROULETTE_COIN 잔액.

### 5-2. play
```python
def play(self, db, user_id: int, now) -> dict:
    """1회 스핀 실행 후 결과/보상/레벨 데이터를 반환한다."""
```
- 단계:
  1) 오늘 feature_type=ROULETTE 활성/스케줄 검증 후 config 로드(TEST_MODE면 기본 config/segment 생성 허용).
  2) slot_index 0~5 정확히 6개, weight>=0, Σweight>0 검증(불일치 시 `INVALID_ROULETTE_CONFIG`).
  3) GameWallet `ROULETTE_COIN` 1장 소비(require_and_consume_token).
  4) weight 기반 랜덤 선택 → RewardService 지급 → roulette_log 기록, game_play 로그 작성.
  5) reward_amount>0이면 내부 승리 50회 스탬프 추가 시도. add_stamp 자동 호출은 하지 않으므로 season_pass 블록은 기본 None.
  6) 선택된 segment/season_pass 결과 dict 반환.

## 6. 데이터 연동
- 테이블: `roulette_config`, `roulette_segment(slot_index 0~5)`, `roulette_log`, 공통 `user_event_log`.
- 인덱스: `INDEX(user_id, created_at)`로 일일 스핀 카운트 최적화.
- config.is_active=0인 경우 긴급 중단 처리, feature_config.is_enabled도 함께 검증.
- 설정 검증: config_id 당 roulette_segment가 정확히 6개이며 Σweight>0이어야 한다. 위반 시 상태 조회와 play 모두 비활성/에러 처리.

## 7. API 연동
- GET `/api/roulette/status`: get_status 결과를 그대로 전달 (segments, 잔액 포함, remaining_spins=0).
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
- `INVALID_ROULETTE_CONFIG`: segment 6칸 미만/초과, 음수 weight, Σweight<=0, config 비활성 등 설정 오류.
- `ROULETTE_CONFIG_MISSING`: 활성 config 없음(단, TEST_MODE는 기본 config/segment 자동 생성).
- GameWallet 오류: 잔액 부족 등 토큰 차감 실패 시 전달되는 예외.

## 변경 이력
- v1.3 (2025-12-25, 시스템 설계팀)
  - GameWallet ROULETTE_COIN 소비, 일일 한도 제거(remaining=0 표기만), auto stamp 비활성, TEST_MODE 기본 config/segment 시드를 반영
- v1.2 (2025-12-09, 시스템 설계팀)
  - max_daily_spins=0 sentinel 무제한 규칙, feature_config.is_enabled/INVALID_FEATURE_SCHEDULE 검증, 작성일 정정
- v1.1 (2025-12-08, 시스템 설계팀)
  - segment를 slot_index 0~5 총 6칸 고정 구조로 명시하고 Σweight>0, 세그먼트 개수 검증 로직을 책임에 추가
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 룰렛 config/segment/log 구조, status/play 흐름, 메서드 시그니처 정의
