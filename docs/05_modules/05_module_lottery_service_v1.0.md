# LotteryService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- LOTTERY Day에 유저가 즉시 복권을 긁어 당첨/꽝 여부와 보상을 확인하는 흐름을 정의한다.

## 2. 범위 (Scope)
- 코드 경로: `backend/app/services/lottery_service.py`와 관련 라우터/스키마/DB 테이블 책임을 다룬다.
- DB 스키마(lottery_config/prize/log) 및 API 계약은 각각 DB/문서/03_api 문서 참조.

## 3. 용어 정의 (Definitions)
- Ticket Limit: config.max_daily_tickets로 정의된 일일 참여 한도.
- Prize: lottery_prize 한 행, label/reward/weight/stock/is_active 정보를 포함(관리자 편집 가능).
- Stock Aware Draw: prize.stock > 0인 항목만 추첨 대상에 포함시키고, 당첨 시 1 감소시키는 로직.

## 4. 책임 (Responsibilities)
- 오늘 feature_type=LOTTERY인지, config.is_active가 켜져 있는지 검증.
- get_today_config에서 남은 티켓 수와 prize 프리뷰 제공.
- play에서 is_active=1이고 stock!=0인 prize만 대상으로 가중치 랜덤 추첨 + 재고 감소(필요 시), Σweight>0 검증, 보상 지급, 로그 기록을 수행.
- SeasonPassService와 연동해 성공 시 스탬프/XP 처리(정책에 따라 호출).

## 5. 주요 메서드 시그니처

### 5-1. get_today_config
```python
def get_today_config(self, db, now, user_id: int) -> dict:
    """오늘 lottery_config + remaining_tickets + prize 프리뷰를 반환한다."""
```
- today_tickets: `lottery_log`에서 user_id+오늘 날짜 기준 카운트.
- remaining_tickets: max_daily_tickets - today_tickets (최소 0).
- prize_preview: label/reward_type만 포함해 UI에 확률/보상을 안내(비활성/재고 0 prize 제외).

### 5-2. play
```python
def play(self, db, user_id: int, now) -> dict:
    """1회 복권 긁기 후 당첨 prize/보상/시즌패스 결과를 반환한다."""
```
- 단계:
  1) feature_type=LOTTERY + config.is_active 확인.
  2) today_tickets < max_daily_tickets 검증.
  3) is_active=1이며 stock이 null 또는 >0인 prize만 대상으로 weight 랜덤 추출(Σweight>0 필수).
  4) 당첨 prize stock이 있다면 1 감소 반영, stock=0이 되면 추첨 대상에서 제외.
  5) RewardService 처리 후 lottery_log + user_event_log 기록.
  6) SeasonPassService.add_stamp() 호출 여부는 정책에 따름.
  7) prize/season_pass 블록 포함한 dict 반환.

## 6. 데이터 연동
- 테이블: `lottery_config`, `lottery_prize`, `lottery_log`, 공통 `user_event_log`.
- 인덱스: `INDEX(user_id, created_at)`로 일일 티켓 카운트 최적화.
- stock NULL은 무제한, 0이면 추첨 제외. 운영 배치로 stock을 리필할 수 있도록 설계.

## 7. API 연동
- GET `/api/lottery/status`: get_today_config 결과(remaining_tickets, prize_preview) 반환.
- POST `/api/lottery/play`: play 결과(prize, season_pass) 반환.

## 8. 예시 응답 (play)
```json
{
  "result": "OK",
  "prize": {
    "id": 3,
    "label": "배민 2만",
    "reward_type": "COUPON",
    "reward_amount": 20000
  },
  "season_pass": {
    "added_stamp": 1,
    "xp_added": 50,
    "current_xp": 180,
    "new_level": 3,
    "leveled_up": false
  }
}
```

## 9. 에러 코드
- `NO_FEATURE_TODAY`: 오늘 feature_type이 LOTTERY가 아니거나 비활성화된 경우.
- `INVALID_FEATURE_SCHEDULE`: 날짜별 스케줄이 0개/2개 이상인 경우.
- `INVALID_LOTTERY_CONFIG`: 추첨 대상 prize 없음, Σweight<=0, stock 조건 불충족, is_active=0 등 설정 오류.
- `DAILY_LIMIT_REACHED`: max_daily_tickets 초과.

## 변경 이력
- v1.1 (2025-12-09, 시스템 설계팀)
  - lottery_prize의 label/reward/weight/stock/is_active를 관리자 편집 가능 항목으로 명시하고, is_active/stock 기반 필터와 Σweight>0 검증을 책임에 추가
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 복권 config/prize/log, 재고 기반 가중치 추첨, status/play 시그니처 정의
