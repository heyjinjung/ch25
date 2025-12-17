# 레벨 API 명세서

- 문서 타입: API
- 버전: v1.1
- 작성일: 2025-12-06
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 레벨 관련 엔드포인트의 요청/응답 계약, 인증, 에러 코드를 상세히 정의하여 클라이언트와 서버 개발을 일관되게 한다.

## 2. 범위 (Scope)
- `/api/season-pass/status`, `/api/season-pass/stamp`, `/api/season-pass/claim` 세 엔드포인트의 동작과 페이로드를 다룬다.
- 게임 내 내부 호출 흐름은 모듈 문서에서 다룬다.

## 3. 용어 정의 (Definitions)
- Season: DB의 `start_date ~ end_date`로 정의되는 시즌 기간 (예: XMAS_2025, 이번 시즌은 2025-12-09 ~ 2025-12-25).
- Stamp: 레벨 도장 1회 기록.
- XP: 레벨 경험치.

## 4. GET /api/season-pass/status
### 4-1. 설명
- 현재 시즌 정보, 유저 진행도, 오늘 도장 여부를 반환한다.

### 4-2. 인증
- 필요 여부: ✅ 필요
- 방식: Authorization 헤더 (Bearer JWT)

### 4-3. 요청
- Method: GET
- Path: `/api/season-pass/status`
- Query Params: 없음
- Request Body: 없음
- Headers:
  - `Authorization: Bearer <token>`

### 4-4. 응답
**성공 (200)**
```json
{
  "season": {
    "id": 1,
    "season_name": "XMAS_2025",
    "start_date": "2025-12-09",
    "end_date": "2025-12-25",
    "max_level": 10,
    "base_xp_per_stamp": 20
  },
  "progress": {
    "current_level": 3,
    "current_xp": 140,
    "total_stamps": 4,
    "last_stamp_date": "2025-12-15"
  },
  "levels": [
    {"level":1,"required_xp":50,"reward_type":"POINT","reward_amount":100,"auto_claim":1},
    {"level":2,"required_xp":100,"reward_type":"POINT","reward_amount":300,"auto_claim":0}
  ],
  "today": {"date": "2025-12-16", "stamped": true}
}
```

**에러 코드**
- 401: 인증 실패
- 404: 활성 시즌 없음

## 5. POST /api/season-pass/stamp
### 5-1. 설명
- 오늘 도장을 1개 찍고 XP/레벨을 갱신한다. 하루 1회 정책 기준으로 중복 요청을 차단한다.
- max_daily=0 sentinel 정책으로 remaining=0이어도 "무제한"을 의미한다.

### 5-2. 인증
- 필요 여부: ✅ 필요
- 방식: Authorization 헤더 (Bearer JWT)

### 5-3. 요청
- Method: POST
- Path: `/api/season-pass/stamp`
- Request Body (JSON):
```json
{
  "source_feature_type": "DICE",
  "xp_bonus": 20
}
```
- Headers:
  - `Authorization: Bearer <token>`

### 5-4. 응답
**성공 (200)**
```json
{
  "added_stamp": 1,
  "xp_added": 40,
  "current_level": 4,
  "leveled_up": true,
  "rewards": [
    {"level":4,"reward_type":"POINT","reward_amount":1000,"auto_claim":1,"claimed_at":"2025-12-27T12:00:00+09:00"}
  ]
}
```

**에러 코드**
- 400: 이미 도장 찍음 / 시즌 기간 아님 / 잘못된 source_feature_type
- 401: 인증 실패
- 404: 활성 시즌 없음
- 409: `NO_ACTIVE_SEASON_CONFLICT` (기간 겹치는 시즌 2개 이상)
 - 비고: 다중 레벨업 시 auto_claim 레벨 보상은 즉시 지급되며 응답의 rewards에 포함된다. max_daily=0 sentinel 정책으로 remaining=0이어도 무제한이다.

## 6. POST /api/season-pass/claim
### 6-1. 설명
- 특정 레벨의 보상을 수동 수령한다. `auto_claim=0` 인 레벨만 대상이다.

### 6-2. 인증
- 필요 여부: ✅ 필요
- 방식: Authorization 헤더 (Bearer JWT)

### 6-3. 요청
- Method: POST
- Path: `/api/season-pass/claim`
- Request Body (JSON):
```json
{
  "level": 2
}
```
- Headers:
  - `Authorization: Bearer <token>`

### 6-4. 응답
**성공 (200)**
```json
{
  "level": 2,
  "reward_type": "POINT",
  "reward_amount": 300,
  "claimed_at": "2025-12-27T12:00:00+09:00"
}
```

**에러 코드**
- 400: 이미 수령 / 자동 지급 레벨 / 레벨 미달
- 401: 인증 실패
- 404: 해당 레벨 보상 없음
 - 비고: 이미 수령한 레벨은 `REWARD_ALREADY_CLAIMED`, auto_claim 레벨은 `AUTO_CLAIM_LEVEL`로 응답한다.

## 변경 이력
- v1.1 (2025-12-06, 시스템 설계팀)
  - stamp 에러 코드에 `NO_ACTIVE_SEASON_CONFLICT`(409) 추가, max_daily=0 무제한 비고를 강조
  - 날짜/버전을 최신화
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 레벨 status/stamp/claim API 계약 정의
