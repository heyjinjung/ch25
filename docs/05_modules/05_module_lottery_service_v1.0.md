# LotteryService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.2
- 작성일: 2025-12-25
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- LOTTERY Day에 유저가 즉시 복권을 긁어 당첨/꽝 여부와 보상을 확인하는 흐름을 정의한다.

## 2. 범위 (Scope)
- 코드 경로: `backend/app/services/lottery_service.py`와 관련 라우터/스키마/DB 테이블 책임을 다룬다.
- DB 스키마(lottery_config/prize/log) 및 API 계약은 각각 DB/문서/03_api 문서 참조.

## 3. 용어 정의 (Definitions)
- Lottery Ticket: GameWallet의 `GameTokenType.LOTTERY_TICKET`. 1회 플레이 시 반드시 1장 소모한다.

## 4. 책임 (Responsibilities)
- 오늘 feature_type=LOTTERY인지, feature_config.is_enabled=1인지 검증한다. config.is_active=1인 단일 활성 레코드가 없으면 `LOTTERY_CONFIG_MISSING`.
- status에서 GameWallet 잔액을 조회하고, 당일 로그 카운트(today_tickets)와 prize 프리뷰를 반환한다. 일일 한도는 제거되어 remaining_tickets는 항상 0(무제한 표기)로 응답한다.
- play에서 유효/활성 prize만 가중치 랜덤 추첨한다. weight<0 또는 Σweight<=0이면 `INVALID_LOTTERY_CONFIG`.
- play 실행 시 `LOTTERY_TICKET` 1장을 강제 차감 후, 재고가 있으면 1 감소, RewardService로 지급, LotteryLog 기록한다.
- reward_amount>0일 때만 SeasonPassService.maybe_add_internal_win_stamp(내부 승리 50회 보상) 시도. 게임 1회당 자동 도장 부여(add_stamp)는 비활성화 상태로 season_pass 응답은 None.
## 5. 주요 메서드 시그니처

### 5-1. get_status
```python
def get_status(self, db, user_id: int, today: date) -> LotteryStatusResponse:
    """오늘 lottery_config + today_tickets + prize 프리뷰 + 지갑 잔액을 반환한다."""
```
- today_tickets: `lottery_log`에서 user_id+오늘 날짜 기준 카운트(모니터링용, 제한 없음).
- remaining_tickets: 항상 0(무제한 표기, 차단 로직 없음).
- prize_preview: is_active=true이고 stock이 NULL 또는 >0인 prize만 반환, Σweight>0 필수.
- token_balance: GameWallet의 LOTTERY_TICKET 잔액.

### 5-2. play
```python
def play(self, db, user_id: int, now) -> dict:
    """1회 복권 긁기 후 당첨 prize/보상/레벨 결과를 반환한다."""
```
- 단계:
  1) feature_type=LOTTERY 활성/스케줄 검증 후 config 로드.
  2) is_active=1이며 stock이 NULL 또는 >0인 prize만 대상으로 weight 랜덤 추출(Σweight>0 필수, 음수 weight 금지).
  3) GameWallet `LOTTERY_TICKET` 1장 소비(require_and_consume_token).
  4) 당첨 prize stock이 있다면 1 감소 반영.
  5) RewardService 지급 후 lottery_log 기록, game_play 로그 작성.
  6) reward_amount>0이면 내부 승리 50회 스탬프 추가 시도. add_stamp 자동 호출은 하지 않으므로 season_pass 블록은 기본 None.
  7) prize/season_pass 블록 포함한 dict 반환.

## 6. 데이터 연동
- 테이블: `lottery_config`, `lottery_prize`, `lottery_log`, 공통 `user_event_log`.
- 인덱스: `INDEX(user_id, created_at)`로 일일 티켓 카운트 최적화.
- stock NULL은 무제한, 0이면 추첨 제외. 운영 배치로 stock을 리필할 수 있도록 설계.

## 7. API 연동
- GET `/api/lottery/status`: get_status 결과(remaining_tickets=0, prize_preview, token_balance) 반환.
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
- `INVALID_LOTTERY_CONFIG`: 추첨 대상 prize 없음, Σweight<=0, 음수 weight, stock 조건 불충족, is_active=0 등 설정 오류.
- `LOTTERY_CONFIG_MISSING`: 활성 config 없음.
- GameWallet 오류: 잔액 부족 등 토큰 차감 실패 시 전달되는 예외.

## 변경 이력
- v1.2 (2025-12-25, 시스템 설계팀)
  - GameWallet LOTTERY_TICKET 소비, 일일 한도 제거(remaining=0 표기만), season_pass 자동 스탬프 중단을 반영
- v1.1 (2025-12-09, 시스템 설계팀)
  - max_daily_tickets=0 sentinel 무제한 규칙, feature_config.is_enabled/INVALID_FEATURE_SCHEDULE 검증, 버전/작성일 정정
  - lottery_prize의 label/reward/weight/stock/is_active를 관리자 편집 가능 항목으로 명시하고, is_active/stock 기반 필터와 Σweight>0 검증을 책임에 추가
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 복권 config/prize/log, 재고 기반 가중치 추첨, status/play 시그니처 정의
