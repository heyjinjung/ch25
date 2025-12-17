# 공통 게임 모듈 가이드 (Roulette/Dice/Lottery/Ranking)

- 문서 타입: 모듈
- 버전: v1.2
- 작성일: 2025-12-07
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- 룰렛/주사위/복권/랭킹 모듈이 공통으로 따라야 할 활성화 검증, 로깅, 레벨 연동 규칙을 정의해 일관된 게임 경험을 제공한다.

## 2. 범위 (Scope)
- `backend/app/services/roulette_service.py`, `dice_service.py`, `lottery_service.py`, `ranking_service.py`에서 공유하는 정책과 데이터 개념을 다룬다.
- 게임별 세부 로직은 개별 모듈 기술서에서 다룬다.

## 3. 용어 정의 (Definitions)
- Feature: 오늘 활성화된 이벤트 타입. 유효값은 **ROULETTE / DICE / LOTTERY / RANKING / SEASON_PASS** 5가지만 존재한다. (NONE은 ENUM 값이 아니며, 스케줄 row 자체가 없음을 의미)
- Today Feature Check: Asia/Seoul 기준 날짜로 `feature_schedule`/`feature_config`를 조회하여 오늘 사용 가능한 feature_type을 판정하는 절차.
- Game Log: 각 게임 전용 로그 테이블(*_log)과 공통 `user_event_log`에 남기는 기록.
- TEST_MODE: 환경변수 `TEST_MODE=true`일 때 활성화되는 개발/QA 모드. today-feature 검증을 우회한다.

## 4. feature_schedule 정책 (통일 규칙)

### 4-1. 날짜별 스케줄 규칙
| 날짜당 row 수 | 의미 | 처리 |
|--------------|------|------|
| 0개 | 오늘 이벤트 없음 | `NO_FEATURE_TODAY` 에러 반환 |
| 1개 | 정상 | 해당 feature_type 활성화 |
| ≥2개 | 데이터 오류 | `INVALID_FEATURE_SCHEDULE` 에러 반환 |

### 4-2. NONE 정책 (공식)
- **"NONE"은 feature_type ENUM 값으로 정의하지 않는다.**
- "이벤트 없는 날"은 `feature_schedule` 테이블에 해당 날짜 row가 없음으로 표현한다.
- feature_type 유효값: `ROULETTE`, `DICE`, `LOTTERY`, `RANKING`, `SEASON_PASS` (5가지만)

### 4-3. today-feature 응답 규칙
다음 조건은 모두 `NO_FEATURE_TODAY` 에러로 처리:
- `feature_schedule`에 오늘 날짜 row가 없음
- row가 있지만 `is_active = 0`
- `feature_config.is_enabled = 0`

## 5. TEST_MODE 정책

### 5-1. 개요
```
if TEST_MODE == true:
    모든 today-feature 검증을 우회한다
    모든 게임 API 접근 가능
    모든 페이지 라우팅 허용
    단, 로직/보상/DB 저장은 운영과 동일하게 동작한다
else:
    기존 today-feature 규칙을 그대로 적용
```

### 5-2. 환경변수 설정
```env
# 백엔드
TEST_MODE=true

# 프론트엔드
VITE_GATE_TODAY_FEATURE=false
```

### 5-3. 적용 범위
- **백엔드**: `FeatureService.validate_feature_active()`에서 schedule 검증 스킵
- **프론트엔드**: 모든 라우트 진입 허용, 게임 카드 모두 활성화
- **DB 저장**: TEST_MODE여도 플레이 로그, 보상, 레벨 변경은 정상 저장됨

## 6. SeasonPass Stamp Hook 정책

### 6-1. 운영 모드 (PROD)
- 게임 플레이 성공 시에만 `SeasonPassService.add_stamp()` 호출
- `NO_FEATURE_TODAY` 상태에서는 **시즌 스탬프가 절대 찍히지 않음**
- 근거: 오늘 활성화된 게임이 아니면 플레이 자체가 불가능

### 6-2. TEST_MODE
- today-feature 검증을 우회하므로 모든 게임 플레이 가능
- 플레이 성공 시 스탬프도 정상 적립됨
- **주의**: 테스트 데이터가 운영 DB에 섞이지 않도록 별도 테스트 계정/DB 사용 권장

### 6-3. 스탬프 적립 조건 요약
| 조건 | 스탬프 적립 |
|------|-----------|
| 정상 플레이 성공 | ✅ 적립 |
| NO_FEATURE_TODAY (운영) | ❌ 플레이 불가 → 적립 불가 |
| TEST_MODE 플레이 | ✅ 적립 (우회 허용) |
| 같은 날 중복 스탬프 | ❌ ALREADY_STAMPED_TODAY |

## 7. 공통 규칙
- 모든 게임 API는 먼저 "오늘 feature_type이 맞는지"를 검사하고, 불일치 시 `NO_FEATURE_TODAY` 에러 반환 (TEST_MODE 제외).
- status/play(혹은 ranking 조회) 모두 JWT 인증 필수.
- 모든 플레이/조회는 `user_event_log`에 event_name, feature_type, meta_json(결과/오류 이유 포함)으로 기록한다.
- 각 게임은 전용 설정 테이블(*_config)과 결과 로그(*_log)를 사용하고, 설정 활성화 플래그(is_active)를 통해 긴급 ON/OFF를 지원한다.
- SeasonPass 연동이 필요한 경우 성공 흐름에서 `SeasonPassService.add_stamp()`를 호출해 스탬프/XP/레벨업을 처리하고 응답에 `season_pass` 블록을 포함한다.
- max_daily_spins/plays/tickets가 0이면 무제한 sentinel로 취급하며 remaining은 0으로 응답하되 차단하지 않는다.

## 8. 공통 에러 코드/응답 규칙
- 표준 코드
  - `NO_FEATURE_TODAY`: 오늘 feature_type이 다르거나, 스케줄 row가 없거나, 비활성화된 경우.
  - `INVALID_FEATURE_SCHEDULE`: 날짜별 스케줄이 2개 이상 등 비정상일 때.
  - `INVALID_<GAME>_CONFIG` (예: `INVALID_ROULETTE_CONFIG`, `INVALID_LOTTERY_CONFIG`): 필수 슬롯/가중치/재고 검증 실패.
  - `DAILY_LIMIT_REACHED`: max_daily_spins/plays/tickets 초과 (단, max_daily=0은 무제한이므로 해당 안 됨).
- 에러 응답 예시
```json
{
  "error": {
    "code": "NO_FEATURE_TODAY",
    "message": "오늘은 이용 가능한 이벤트가 없습니다"
  }
}
```

## 9. 공통 데이터 개념
- *_config: 게임별 활성 여부, 일일 제한(max_daily_*), 보상/확률 등 정책을 관리한다.
- *_log: 유저별 플레이 결과, 보상 내역을 기록한다. 일일 제한 계산 시 user_id + 날짜 기준 카운트를 조회한다.
- 공통 인덱스 권장: `INDEX(user_id, created_at)`로 최근 플레이/횟수 조회를 최적화한다.

## 변경 이력
- v1.2 (2025-12-07, 시스템 설계팀)
  - feature_schedule 정책 전면 정리: row 없음=NO_FEATURE, NONE ENUM 미사용 명시
  - TEST_MODE 공식 스펙 추가: 백엔드/프론트 우회 정책 통일
  - SeasonPass stamp hook 정책 확정: 운영/테스트 모드별 동작 명확화
- v1.1 (2025-12-09, 시스템 설계팀)
  - feature_config.is_enabled, feature_schedule 개수 검증, max_daily=0 sentinel 무제한 규칙을 공통 규칙에 반영
- v1.0 (2025-12-08, 시스템 설계팀)
  - 공통 활성화 검증, 로깅, 레벨 연동, 테이블 개념 정의
