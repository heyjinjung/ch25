# XMAS 1Week API 개요 및 핵심 엔드포인트

- 문서 타입: API
- 버전: v1.3
- 작성일: 2025-12-25
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 이벤트 기간에 제공되는 공통/게임/레벨 API의 계약을 한 곳에 정리한다.
- 프론트엔드와의 데이터 계약을 명확히 하여 개발/QA 효율을 높인다.

## 2. 범위 (Scope)
- 시즌 패스/게임(룰렛·주사위·복권·랭킹) 핵심 엔드포인트의 요청/응답/인증/에러 코드를 요약한다.
- `/api/today-feature`는 2025-12-25 기준 폐기(아카이브)되어 운영에서는 404/410이 정상이다.
- Admin 전용 API, 인증/토큰 발급 로직 상세는 범위 밖이다.

## 3. 용어 정의 (Definitions)
- Feature: 오늘 활성화된 이벤트 타입(ROULETTE/DICE/SEASON_PASS/LOTTERY/RANKING).
- Stamp: 레벨 도장 1회 기록.
- XP: 레벨 경험치.

## 4. 공통 응답/에러 규칙
- 에러 응답은 `error.code`, `error.message` 형태로 내려온다.
- 에러 응답 예시:
```json
{
  "error": {
    "code": "NO_FEATURE_TODAY",
    "message": "NO_FEATURE_TODAY"
  }
}
```
- 인증 필요 엔드포인트는 Bearer JWT 필수이며, `TEST_MODE=true`일 때만 토큰 없이 demo user로 통과된다(운영 금지).
- 대표 코드
  - `NO_FEATURE_TODAY`: today-feature 스케줄 없음 또는 feature_config 미존재.
  - `FEATURE_NOT_ACTIVE`: feature gate 활성 상태에서 feature 불일치, 또는 feature_config 비활성.
  - `INVALID_FEATURE_SCHEDULE`: feature_schedule에서 같은 날짜에 2개 이상 row가 존재하는 데이터 오류.
  - `INVALID_ROULETTE_CONFIG` / `INVALID_LOTTERY_CONFIG`: 설정 검증(6칸/가중치 합/재고 등) 실패.
  - `INVALID_CONFIG`: 기타 게임 설정 오류(구성 누락, 주사위 값 범위 오류 등).
  - `DAILY_LIMIT_REACHED`: 일일 제한 초과(운영 정책).
  - `LOCK_NOT_ACQUIRED`: DB 락 타임아웃/데드락으로 재시도 필요.
  - `NOT_ENOUGH_TOKENS`: 게임 토큰 부족으로 play 실패.
  - `NO_ACTIVE_SEASON` / `NO_ACTIVE_SEASON_CONFLICT`: 활성 시즌 없음/중복.
  - `ALREADY_STAMPED_TODAY`: 일일 체크인 스탬프 중복.
  - `REWARD_ALREADY_CLAIMED` / `AUTO_CLAIM_LEVEL` / `LEVEL_NOT_REACHED` / `LEVEL_NOT_FOUND`: 레벨 보상 관련 오류.
  - `AUTH_REQUIRED` / `TOKEN_INVALID`: 인증 누락/토큰 무효.
  - `VALIDATION_ERROR`: 요청 파라미터/스키마 검증 오류.
  - `DB_SCHEMA_MISMATCH` / `DB_ERROR`: 마이그레이션 미적용 또는 DB 오류.

## 5. 공통/레거시 API
### 5-1. GET /api/today-feature (폐기/레거시)
- 설명: 오늘 활성화된 Feature 정보를 반환한다. 운영은 404/410, 개발/테스트에서만 레거시 응답을 유지한다.
- 인증: 선택 (Bearer JWT를 주면 `user_id` 포함)
- Method/Path: GET `/api/today-feature`
- Response 예시:
```json
{
  "feature_type": "ROULETTE" | "DICE" | "SEASON_PASS" | "LOTTERY" | "RANKING",
  "user_id": 1234
}
```
- 비고: 스케줄 없음은 `feature_type=null`로 응답(레거시 동작). FE 라우팅에 사용하지 않는다.

### 5-2. GET /api/feature (관리자/디버깅)
- 설명: 특정 날짜의 Feature 정보를 조회한다.
- 인증: 필요 (관리자)
- Method/Path: GET `/api/feature?date=YYYY-MM-DD`
- Query Params: `date` (필수)
- 성공 200 예시: today-feature와 동일 구조
- 주요 에러: 400(형식 오류), 404(해당 날짜 스케줄 없음), 409(`INVALID_FEATURE_SCHEDULE`)

## 6. 시즌 패스 API 요약
- 상세 스펙은 `docs/03_api/03_api_season_pass_v1.0.md` 참고.

### 6-1. GET /api/season-pass/status
- 설명: 현재 시즌 정보, 유저 진행도(레벨/XP/도장), 오늘 도장 여부를 조회한다.
- 인증: 필요 (Bearer JWT)
- Method/Path: GET `/api/season-pass/status`
- Query Params: 없음
- 성공 200 예시:
```json
{
  "season": {
    "id": 1,
    "season_name": "XMAS_1WEEK_2025",
    "start_date": "2025-12-09",
    "end_date": "2025-12-25",
    "max_level": 10,
    "base_xp_per_stamp": 10
  },
  "progress": {
    "current_level": 3,
    "current_xp": 140,
    "total_stamps": 4,
    "last_stamp_date": "2025-12-24",
    "next_level_xp": 150
  },
  "levels": [
    {"level":1,"required_xp":50,"reward_type":"POINT","reward_amount":1000,"auto_claim":1}
  ],
  "today": {"date": "2025-12-24", "stamped": true}
}
```
- 주요 에러: 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_ACTIVE_SEASON`)
- 비고: 시즌 브리지 기간에는 `event_bridge` 확장 필드가 추가될 수 있다.
- 일일 스탬프 규칙: `today.stamped`는 오늘 날짜(`YYYY-MM-DD`) 키 스탬프가 있을 때만 true.

### 6-2. POST /api/season-pass/stamp
- 설명: 오늘 도장을 1개 찍고 XP/레벨을 갱신한다.
- 인증: 필요 (Bearer JWT)
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
- 주요 에러: 400(`ALREADY_STAMPED_TODAY`), 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_ACTIVE_SEASON`), 409(`NO_ACTIVE_SEASON_CONFLICT`)
- 비고: XP=base_xp_per_stamp+xp_bonus, auto_claim 레벨 보상 즉시 지급.

### 6-3. POST /api/season-pass/claim
- 설명: 특정 레벨의 보상을 수동 수령한다.
- 인증: 필요 (Bearer JWT)
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
- 주요 에러: 400(`REWARD_ALREADY_CLAIMED`, `AUTO_CLAIM_LEVEL`, `LEVEL_NOT_REACHED`), 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`LEVEL_NOT_FOUND`)
- 비고: auto_claim 레벨은 수동 클레임 불가.

### 6-4. GET /api/vault/status (요약)
- 설명: 금고 locked/available/만료 정보를 반환한다.
- 비고: Phase 1 기준 `locked_balance`가 단일 기준이며 `vault_balance`는 legacy mirror.
- 주요 필드: `eligible`, `locked_balance`, `available_balance`, `expires_at`, `vault_balance`, `cash_balance`, `vault_fill_used_at`, `unlock_rules_json`.

### 6-5. GET /api/ui-config/{key} (요약)
- 설명: 앱 UI 문구/CTA 설정을 JSON으로 조회한다. `ticket_zero` 키로 token_balance=0 패널 문구/버튼을 운영한다.
- 인증: 공개(필요 시 캐시 짧게 설정). Admin 편집은 `/admin/api/ui-config/{key}` 사용.

## 7. 게임별 API (룰렛/주사위/복권/랭킹)
각 게임 엔드포인트 공통 규칙: feature config 확인 → 유저 조건 체크 → 결과/보상 계산 → 시즌 패스 스탬프/로그 기록.

### 7-1. 게임 Status/Play 공통 규칙
- 엔드포인트: `/api/roulette|dice|lottery/status`, `/api/roulette|dice|lottery/play`
- 인증: 필요 (Bearer JWT, TEST_MODE 예외)
- Status 응답: `token_type`, `token_balance` 포함(미지급 시 0).
- Play 에러: 토큰 부족 시 400(`NOT_ENOUGH_TOKENS`).
- max_daily_* = 0은 무제한 sentinel, remaining=0이어도 차단하지 않는다.

### 7-2. GET /api/roulette/status (예시)
- 설명: 오늘 룰렛 플레이 가능 여부, 잔여 횟수, 보상 구성을 반환한다.
- 인증: 필요
- Method/Path: GET `/api/roulette/status`
- 성공 200 예시:
```json
{
  "config_id": 1,
  "name": "Test Roulette",
  "max_daily_spins": 0,
  "today_spins": 0,
  "remaining_spins": 0,
  "token_type": "ROULETTE_COIN",
  "token_balance": 3,
  "segments": [
    {"id": 10, "label": "100 코인", "reward_type": "POINT", "reward_amount": 100, "slot_index": 0}
  ],
  "feature_type": "ROULETTE"
}
```
- 주요 에러: 400(`INVALID_ROULETTE_CONFIG`, `INVALID_CONFIG`), 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_FEATURE_TODAY`)
- 비고: max_daily_spins=0이면 remaining=0이어도 무제한 의미.

### 7-3. POST /api/roulette/play (예시)
- 설명: 룰렛을 1회 플레이하고 결과/보상을 반환한다.
- 인증: 필요
- Method/Path: POST `/api/roulette/play`
- 성공 200 예시:
```json
{
  "result": "OK",
  "segment": {"id": 10, "label": "100 코인", "reward_type": "POINT", "reward_amount": 100, "slot_index": 0},
  "season_pass": null
}
```
- 주요 에러: 400(`NOT_ENOUGH_TOKENS`, `INVALID_ROULETTE_CONFIG`, `INVALID_CONFIG`), 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_FEATURE_TODAY`)

### 7-4. POST /api/dice/play (예시)
- 설명: 유저/딜러가 각각 2개씩 주사위를 굴려 합계를 비교하고 보상을 반환한다.
- 인증: 필요
- Method/Path: POST `/api/dice/play`
- 성공 200 예시:
```json
{
  "result": "OK",
  "game": {
    "user_dice": [4, 6],
    "dealer_dice": [3, 2],
    "user_sum": 10,
    "dealer_sum": 5,
    "outcome": "WIN",
    "reward_type": "POINT",
    "reward_amount": 10000
  },
  "season_pass": null
}
```
- 주요 에러: 400(`NOT_ENOUGH_TOKENS`, `INVALID_CONFIG`), 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_FEATURE_TODAY`)

### 7-5. POST /api/lottery/play (예시)
- 설명: 복권 즉시당첨 결과를 반환한다.
- 인증: 필요
- Method/Path: POST `/api/lottery/play`
- 성공 200 예시:
```json
{
  "result": "OK",
  "prize": {
    "id": 3,
    "label": "배민 2만",
    "reward_type": "COUPON",
    "reward_amount": 20000
  },
  "season_pass": null
}
```
- 주요 에러: 400(`NOT_ENOUGH_TOKENS`, `INVALID_LOTTERY_CONFIG`, `INVALID_CONFIG`), 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_FEATURE_TODAY`)

### 7-6. GET /api/ranking/today (예시)
- 설명: 당일 랭킹(외부 랭킹 포함)을 조회한다.
- 인증: 필요
- Method/Path: GET `/api/ranking/today`
- 성공 200 예시:
```json
{
  "date": "2025-12-26",
  "entries": [],
  "my_entry": null,
  "external_entries": [
    {"rank": 1, "user_id": 101, "user_name": "김OO", "deposit_amount": 550000, "play_count": 12, "memo": null}
  ],
  "my_external_entry": {"rank": 12, "user_id": 201, "user_name": "박OO", "deposit_amount": 180000, "play_count": 4, "memo": null},
  "feature_type": "RANKING"
}
```
- 주요 에러: 401(`AUTH_REQUIRED`/`TOKEN_INVALID`), 404(`NO_FEATURE_TODAY`)

## 변경 이력
- v1.3 (2025-12-25, 시스템 설계팀)
  - today-feature 폐기/레거시 안내 추가, 인증/에러 코드 표준화 반영
  - 게임/레벨/금고/티켓 제로 응답 요약 업데이트, 토큰 부족/일일 스탬프 오류 코드 반영
  - 응답 예시를 최신 스키마에 맞춰 정리
- v1.2 (2025-12-11, 시스템 설계팀)
  - `/api/today-feature` 인증을 선택 사항으로 전환하고 JWT가 있을 때만 `user_id`를 포함하도록 명세 수정
- v1.1 (2025-12-06, 시스템 설계팀)
  - max_daily=0 sentinel 정책을 모든 게임/레벨 비고에 명시하고 `NO_FEATURE_TODAY`를 is_enabled=0에도 적용하는 설명 추가
  - 공통 에러 코드 설명에서 무제한 정책 문구를 명확화
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 공통/레벨/게임 API 계약 정리 및 예시 응답 추가
  - 레벨 stamp 요청 본문을 `source_feature_type`, `xp_bonus`로 명시
