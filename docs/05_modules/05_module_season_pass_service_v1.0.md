# SeasonPassService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- 시즌패스(도장, XP, 레벨, 보상)에 대한 비즈니스 로직을 정의하고, API/게임 서비스가 재사용할 수 있는 메서드 계약을 제시한다.

## 2. 범위 (Scope)
- 코드 경로 `backend/app/services/season_pass_service.py`에 구현될 클래스/메서드 시그니처, 책임, 연동 포인트를 다룬다.
- DB 스키마는 DB 문서를, API 페이로드는 API 문서를 참고한다.

## 3. 용어 정의 (Definitions)
- Season: 7일 단위 시즌 기간 (예: XMAS_1WEEK_2025).
- XP: 레벨 업에 필요한 경험치.
- Stamp: 일 1회 적립 가능한 시즌패스 도장.

## 4. 메서드 시그니처 & 책임

### 4-1. get_current_season
```python
def get_current_season(self, now: datetime.date | datetime.datetime) -> SeasonPassConfig | None:
    """오늘 날짜 기준 활성 시즌을 반환한다."""
```
- start_date <= today <= end_date 인 시즌을 조회.

### 4-2. get_or_create_progress
```python
def get_or_create_progress(self, user_id: int, season_id: int) -> SeasonPassProgress:
    """유저 진행도를 조회하거나 없으면 생성한다."""
```
- UNIQUE(user_id, season_id) 보장, 초기값 current_level=1, current_xp=0, total_stamps=0.

### 4-3. add_stamp
```python
def add_stamp(self, user_id: int, source_feature_type: str, xp_bonus: int = 0) -> dict:
    """도장 1개 추가 + XP 업데이트 + 레벨업/보상 처리."""
```
- 로직 단계:
  1) 현재 날짜 기준 유효 시즌 조회 (start_date <= today <= end_date).
  2) season_pass_progress 조회/생성.
  3) season_pass_stamp_log UNIQUE(user_id, season_id, date)로 오늘 중복 방지.
  4) xp_to_add = base_xp_per_stamp + xp_bonus.
  5) current_xp, total_stamps, last_stamp_date 갱신.
  6) required_xp <= current_xp 인 최대 level 찾고 레벨업 판단.
  7) 신규 달성 레벨 중 auto_claim=1은 보상 지급 + reward_log 기록.
  8) stamp_log insert (xp_earned=xp_to_add, source_feature_type 기록).
  9) 결과 dict 반환: added_stamp, xp_added, current_level, leveled_up, rewards[].

### 4-4. get_status
```python
def get_status(self, user_id: int) -> dict:
    """현재 시즌, 레벨/XP, 레벨 목록, 오늘 도장 여부를 반환한다."""
```
- today-stamped 여부는 stamp_log 조회로 판단.

### 4-5. claim_reward
```python
def claim_reward(self, user_id: int, level: int) -> dict:
    """auto_claim=0 레벨 보상을 수동 수령한다."""
```
- 조건: 활성 시즌 존재, 진행 레벨 >= level, reward_log UNIQUE(user_id, season_id, level)로 중복 방지.

## 5. 연동 포인트
- RouletteService/DiceService/LotteryService/RankingService: 게임 성공 시 `add_stamp()` 호출 가능.
- FeatureService: 오늘 feature_type=SEASON_PASS 여부에 따라 시즌패스 전용 페이지 노출.
- RewardService: auto_claim 및 claim_reward 시 실제 포인트/쿠폰 지급 처리 담당.

## 6. 예시 시퀀스 (add_stamp)
1) Router `/api/season-pass/stamp` → JWT 인증 통과.
2) Service가 현재 시즌 조회 후 progress 로드.
3) 오늘 도장 중복 여부 확인 → XP 계산 → 레벨업/보상 결정.
4) stamp_log/ reward_log 기록 후 결과 dict 반환.

## 변경 이력
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: SeasonPassService 책임/시그니처/연동 포인트 정의
