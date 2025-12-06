# XMAS 1Week API 개요 및 핵심 엔드포인트

- 문서 타입: API
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 이벤트 기간에 제공되는 공통/게임/시즌패스 API의 계약을 한 곳에 정리한다.
- 프론트엔드와의 데이터 계약을 명확히 하여 개발/QA 효율을 높인다.

## 2. 범위 (Scope)
- `/api/today-feature`, 시즌패스 3종 API, 게임별 status/play/today 엔드포인트의 요청/응답/인증/에러 코드를 다룬다.
- Admin 전용 API, 인증/토큰 발급 로직 상세는 범위 밖이다.

## 3. 용어 정의 (Definitions)
- Feature: 오늘 활성화된 이벤트 타입(ROULETTE/DICE/SEASON_PASS/LOTTERY/RANKING).
- Stamp: 시즌패스 도장 1회 기록.
- XP: 시즌패스 경험치.

## 4. 공통 에러 코드
- 모든 API는 JSON 에러 응답에 `code`, `message`를 포함한다.
- 주요 코드
  - `NO_FEATURE_TODAY`: 오늘 스케줄에 활성 Feature가 없거나 is_enabled=0으로 비활성화된 경우.
  - `INVALID_FEATURE_SCHEDULE`: feature_schedule에서 같은 날짜에 2개 이상 row가 존재하는 데이터 오류.
  - `NO_ACTIVE_SEASON`: KST 오늘 기준 활성 시즌이 없을 때.
  - `NO_ACTIVE_SEASON_CONFLICT`: start/end 범위를 충족하는 시즌이 2개 이상인 데이터 충돌.
  - `INVALID_ROULETTE_CONFIG` / `INVALID_LOTTERY_CONFIG`: 설정 검증(6칸/가중치 합/재고 등) 실패.
  - `DAILY_LIMIT_REACHED`: 일일 제한(max_daily_spins/plays/tickets) 초과.
  - `UNAUTHORIZED`/`FORBIDDEN`: 인증 실패/권한 없음.


## 5. 공통 API
### 4-1. GET /api/today-feature
- 설명: 오늘 활성화된 Feature 정보를 반환한다.
- 인증: 필요 여부 ❌
- Method/Path: GET `/api/today-feature`
- Params/Body: 없음
- 성공 200 예시:
```json
{
  "date": "2025-12-24",
  "feature_type": "ROULETTE",
  "title": "크리스마스 룰렛 Day",
  "page_path": "/roulette"
}
```
- 주요 에러: 204 (오늘 일정 없음 → `feature_type=NONE`), 409(`INVALID_FEATURE_SCHEDULE`)

### 4-2. GET /api/feature
- 설명: 특정 날짜의 Feature 정보를 조회한다(관리/디버깅용).
- 인증: 필요 여부 ✅ (관리자)
- Method/Path: GET `/api/feature?date=YYYY-MM-DD`
- Query Params: `date` (필수)
- 성공 200 예시: today-feature와 동일 구조
- 주요 에러: 400(형식 오류), 404(해당 날짜 스케줄 없음), 409(`INVALID_FEATURE_SCHEDULE`)

## 6. 시즌패스 API 요약
- 상세 스펙은 `docs/03_api/03_api_season_pass_v1.0.md` 참고.

### 5-1. GET /api/season-pass/status
- 설명: 현재 시즌 정보, 유저 진행도(레벨/XP/도장), 오늘 도장 여부를 조회한다.
- 인증: ✅ 필요 (Authorization: Bearer JWT)
- Method/Path: GET `/api/season-pass/status`
- Query Params: 없음
- Body: 없음
- 성공 200 예시:
```json
{
  "season": {"id": 1, "season_name": "XMAS_1WEEK_2025", "max_level": 10},
  "progress": {"current_level": 3, "current_xp": 140, "total_stamps": 4},
  "levels": [{"level":1,"required_xp":50},{"level":2,"required_xp":100}],
  "today": {"date": "2025-12-24", "stamped": true}
}
```
- 주요 에러: 401(인증 실패), 404(활성 시즌 없음)

### 5-2. POST /api/season-pass/stamp
- 설명: 오늘 도장을 1개 찍고 XP/레벨을 갱신한다.
- 인증: ✅ 필요 (Authorization: Bearer JWT)
- Method/Path: POST `/api/season-pass/stamp`
- Body(JSON): `{ "source_feature_type": "DICE", "xp_bonus": 20 }`
- 성공 200 예시:
```json
{
  "added_stamp": 1,
  "xp_added": 20,
  "current_level": 4,
  "leveled_up": true,
  "rewards": [{"level":4,"reward_type":"POINT","reward_amount":1000}]
}
```
- 주요 에러: 400(이미 도장 찍음), 401(인증 실패), 404(`NO_ACTIVE_SEASON`), 409(`NO_ACTIVE_SEASON_CONFLICT`)

### 5-3. POST /api/season-pass/claim
- 설명: 특정 레벨의 보상을 수동 수령한다.
- 인증: ✅ 필요 (Authorization: Bearer JWT)
- Method/Path: POST `/api/season-pass/claim`
- Body(JSON): `{ "level": <int> }`
- 성공 200 예시:
```json
{
  "level": 4,
  "reward_type": "POINT",
  "reward_amount": 1000,
  "claimed_at": "2025-12-24T12:00:00+09:00"
}
```
- 주요 에러: 400(이미 수령), 401(인증 실패), 404(해당 레벨 보상 없음)

## 7. 게임별 API (룰렛/주사위/복권/랭킹)
각 게임 엔드포인트 공통 규칙: 오늘 `feature_type` 검증 → 유저 조건 체크 → 결과/보상 계산 → 시즌패스 `add_stamp` 연동(필요 시) → 로그 저장.

### 6-1. GET /api/roulette/status (예시)
- 설명: 오늘 룰렛 플레이 가능 여부, 잔여 횟수, 보상 구성을 반환한다.
- 인증: ✅ 필요
- Method/Path: GET `/api/roulette/status`
- 성공 200 예시:
```json
{
  "playable": true,
  "remaining": 1,
  "slots": [
    {"label": "POINT_100", "weight": 40},
    {"label": "POINT_1000", "weight": 5}
  ]
}
```
- 주요 에러: 400(`DAILY_LIMIT_REACHED`, `INVALID_ROULETTE_CONFIG`), 403(`NO_FEATURE_TODAY`), 401(`UNAUTHORIZED`)

### 6-2. POST /api/roulette/play (예시)
- 설명: 룰렛을 1회 플레이하고 결과/보상을 반환한다.
- 인증: ✅ 필요
- Method/Path: POST `/api/roulette/play`
- 성공 200 예시:
```json
{
  "result": "POINT_1000",
  "reward_amount": 1000,
  "stamp_added": true
}
```
- 주요 에러: 400(`DAILY_LIMIT_REACHED`, `INVALID_ROULETTE_CONFIG`), 403(`NO_FEATURE_TODAY`), 401(`UNAUTHORIZED`)

### 6-3. POST /api/dice/play (예시)
- 설명: 유저/딜러가 각각 2개씩 주사위를 굴려 합계를 비교하고 보상을 반환한다.
- 인증: ✅ 필요
- Method/Path: POST `/api/dice/play`
- 성공 200 예시:
```json
{
  "game": {
    "user_dice": [4, 6],
    "dealer_dice": [3, 2],
    "user_sum": 10,
    "dealer_sum": 5,
    "outcome": "WIN"
  },
  "reward": {"type": "POINT", "amount": 10000},
  "stamp_added": false
}
```
- 주요 에러: 400(`DAILY_LIMIT_REACHED`, `INVALID_FEATURE_SCHEDULE`), 403(`NO_FEATURE_TODAY`), 401(`UNAUTHORIZED`)

### 6-4. POST /api/lottery/play (예시)
- 설명: 복권 즉시당첨 결과를 반환한다(관리자 편집 가능한 label/reward/weight/stock/is_active 반영).
- 인증: ✅ 필요
- Method/Path: POST `/api/lottery/play`
- 성공 200 예시:
```json
{
  "prize": {
    "id": 3,
    "label": "배민 2만",
    "reward_type": "COUPON",
    "reward_amount": 20000
  },
  "stamp_added": true
}
```
- 주요 에러: 400(`DAILY_LIMIT_REACHED`, `INVALID_LOTTERY_CONFIG`), 403(`NO_FEATURE_TODAY`), 401(`UNAUTHORIZED`)

### 6-5. GET /api/ranking/today (예시)
- 설명: 당일 랭킹(관리자 입력 ranking_daily 기준)을 조회한다.
- 인증: ✅ 필요
- Method/Path: GET `/api/ranking/today`
- 성공 200 예시:
```json
{
  "date": "2025-12-26",
  "top": [
    {"rank":1,"display_name":"김OO","score":550000},
    {"rank":2,"display_name":"박OO","score":420000}
  ],
  "me": {"rank":12,"score":180000,"is_in_top":false}
}
```
- 주요 에러: 403(`NO_FEATURE_TODAY`), 401(`UNAUTHORIZED`)

## 변경 이력
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 공통/시즌패스/게임 API 계약 정리 및 예시 응답 추가
  - 시즌패스 stamp 요청 본문을 `source_feature_type`, `xp_bonus`로 명시
