# SeasonPassService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.2
- 작성일: 2025-12-25
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- 레벨(도장, XP, 레벨, 보상)에 대한 비즈니스 로직을 정의하고, API/게임 서비스가 재사용할 수 있는 메서드 계약을 제시한다.

## 2. 범위 (Scope)
- 코드 경로 `backend/app/services/season_pass_service.py`에 구현될 클래스/메서드 시그니처, 책임, 연동 포인트를 다룬다.
- DB 스키마는 DB 문서를, API 페이로드는 API 문서를 참고한다.

## 3. 용어 정의 (Definitions)
- Season: DB의 `start_date ~ end_date`로 정의되는 시즌 기간. 시즌 이름에 '1WEEK'가 포함되어 있더라도 실제 기간은 start_date/end_date로 결정된다. TEST_MODE일 때 활성 시즌이 없으면 기본 시즌을 자동 생성한다.
- XP: 레벨 업에 필요한 경험치.
- Stamp: 일 1회 적립 가능한 레벨 도장. period_key가 오늘 날짜 ISO(`YYYY-MM-DD`)인 경우 하루 1회만 허용한다.
- period_key: `SeasonPassStampLog.period_key`. 기본은 오늘 `today.isoformat()`이며, 이벤트/누적 과제(예: INTERNAL_WIN_50) 등 다른 키도 허용한다.

## 4. 메서드 시그니처 & 책임

### 4-1. get_current_season
```python
def get_current_season(self, now: datetime.date | datetime.datetime) -> SeasonPassConfig | None:
    """오늘 날짜 기준 활성 시즌을 반환한다."""
```
- start_date <= today <= end_date 인 시즌을 조회하며, 2건 이상이면 `NO_ACTIVE_SEASON_CONFLICT`를 500으로 반환한다. TEST_MODE일 때 활성 시즌이 없으면 7일짜리 기본 시즌을 생성한다.

### 4-2. get_or_create_progress
```python
def get_or_create_progress(self, user_id: int, season_id: int) -> SeasonPassProgress:
    """유저 진행도를 조회하거나 없으면 생성한다."""
```
- UNIQUE(user_id, season_id) 보장, 초기값 current_level=1, current_xp=0, total_stamps=0.

### 4-3. add_stamp
```python
def add_stamp(self, user_id: int, source_feature_type: str, xp_bonus: int = 0, now: date | datetime | None = None, stamp_count: int = 1, period_key: str | None = None) -> dict:
    """도장 1개 추가 + XP 업데이트 + 레벨업/보상 처리."""
```
- 로직 단계:
    1) 현재 날짜 기준 유효 시즌 조회 (start_date <= today <= end_date). 없으면 404.
    2) season_pass_progress 조회/생성.
    3) period_key 기본값은 today.isoformat(). period_key가 오늘 날짜와 같을 때만 하루 1회 제한을 적용하며, 중복 시 `ALREADY_STAMPED_TODAY` 400 반환.
    4) xp_to_add = base_xp_per_stamp * stamp_count + xp_bonus.
    5) current_xp, total_stamps, last_stamp_date 갱신.
    6) required_xp <= current_xp 인 level을 계산하고 auto_claim 레벨은 즉시 RewardService로 지급하며 reward_log를 적재한다. 실패 시에도 stamp 흐름은 진행한다.
    7) stamp_log는 period_key와 source_feature_type 단위로 upsert한다. 기존 레코드가 있으면 stamp_count/xp_earned 누적.
    8) 결과 dict 반환: added_stamp, xp_added, current_level, leveled_up, rewards[].

### 4-4. get_status
```python
def get_status(self, user_id: int) -> dict:
    """현재 시즌, 레벨/XP, 레벨 목록, 오늘 도장 여부를 반환한다."""
```
- today-stamped 여부는 period_key=today.isoformat(), date=today 모두 일치하는 stamp_log 존재 여부로 판단한다. reward_label은 고정 맵(1~10)으로 UI 안내용.

### 4-5. claim_reward
```python
def claim_reward(self, user_id: int, level: int) -> dict:
    """auto_claim=0 레벨 보상을 수동 수령한다."""
```
- 조건: 활성 시즌 존재, 진행 레벨 >= level, reward_log UNIQUE(user_id, season_id, level)로 중복 방지.

### 4-6. maybe_add_stamp / maybe_add_internal_win_stamp
- maybe_add_stamp: add_stamp를 감싸며 `ALREADY_STAMPED_TODAY`, `NO_ACTIVE_SEASON`은 무시하고 None을 반환한다.
- maybe_add_internal_win_stamp: 주사위/룰렛/복권 승리 합계가 threshold(기본 50) 이상일 때 period_key="INTERNAL_WIN_50"로 1회 스탬프를 시도한다.

### 4-7. add_bonus_xp
- raw XP만 추가하는 보조 메서드. stamp_log를 적재하지 않고 auto_claim 레벨 보상만 처리한다. LevelXP 외부 서비스로 동기화하지 않는다.

## 5. 연동 포인트
- RouletteService/DiceService/LotteryService: 게임 승리 시 maybe_add_internal_win_stamp(내부 승리 누적)만 호출한다. 게임 1회당 자동 add_stamp는 사용하지 않는다.
- FeatureService: 오늘 feature_type=SEASON_PASS 여부에 따라 레벨 전용 페이지 노출.
- RewardService: auto_claim 및 claim_reward 시 실제 포인트/쿠폰 지급 처리 담당. 보상 지급 실패는 stamp 플로우를 막지 않는다.

## 6. 예시 시퀀스 (add_stamp)
1) Router `/api/season-pass/stamp` → JWT 인증 통과.
2) Service가 현재 시즌 조회 후 progress 로드.
3) period_key=today.isoformat() 중복 여부 확인 → XP 계산 → 레벨업/auto_claim 보상 결정.
4) stamp_log(기간키 단위) / reward_log 기록 후 결과 dict 반환.

## 7. 타임존 주의
- period_key와 date 비교는 `now.date()` 기반으로 UTC/KST 변환 없이 처리된다. 일일 도장 정책이 한국 시간 기준이라면 API 라우터/cron에서 KST 변환 후 호출해야 한다.

## 변경 이력
- v1.2 (2025-12-25, 시스템 설계팀)
    - period_key=YYYY-MM-DD 1일 1회 규칙, TEST_MODE 기본 시즌 생성, maybe_add_stamp/ maybe_add_internal_win_stamp/ add_bonus_xp, 보상 실패 허용을 반영
- v1.1 (2025-12-09, 시스템 설계팀)
    - 활성 시즌 중복 시 `NO_ACTIVE_SEASON_CONFLICT`(409) 처리, stamp_log xp_earned 필수 및 auto_claim 즉시 지급을 명시
- v1.0 (2025-12-08, 시스템 설계팀)
    - 최초 작성: SeasonPassService 책임/시그니처/연동 포인트 정의
