---
Project: Golden
Type: Tech Spec
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# 이벤트 수집 포인트 정의서 (Event Collection Definitions)

본 문서는 리텐션 엔진이 구독하는 핵심 이벤트 3종(**연패, 자산 급감, 세션**)의 수집 포인트, 트리거 조건, 그리고 데이터 스키마를 정의합니다.

---

## 1. 연패 감지 (EVENT_LOSS_STREAK)

유저가 연속적인 패배로 인한 좌절(Frustration)을 겪는 순간을 포착합니다.

*   **수집 시점**: 모든 게임(`Dice`, `Roulette`, `Slot` 등)의 **베팅 결과 처리 직후**.
*   **Trigger Condition**: 결과가 `LOSE` (배당금 0원)일 때.
*   **Redis Key**: `user:{id}:loss_streak` (Increment)
*   **Alert Threshold**: `streak_count >= 5`

### Event Payload (JSON)
```json
{
  "event_type": "LOSS_STREAK",
  "timestamp": 1705481234000,
  "data": {
    "user_id": 1004,
    "game_type": "roulette",
    "bet_amount": 50000,
    "current_streak": 5,
    "total_loss_amount": 250000
  }
}
```

---

## 2. 자산 급감 감지 (EVENT_ASSET_DEPLETION)

단시간 내에 무리한 베팅으로 보유 자산이 급격히 소진되는 '틸팅(Tilting)' 상태를 감지합니다.

*   **수집 시점**: 세션 시작 시점의 잔액(`StartBalance`) 대비 현재 잔액(`CurrentBalance`) 비교.
*   **Trigger Condition**: `(StartBalance - CurrentBalance) / StartBalance >= 0.5` (50% 이상 손실).
*   **Redis Key**: `user:{id}:session_start_balance`
*   **Reset Condition**: 유저가 재입금(Deposit) 하거나 세션이 종료될 때.

### Event Payload (JSON)
```json
{
  "event_type": "ASSET_DEPLETION",
  "timestamp": 1705481299000,
  "data": {
    "user_id": 1004,
    "session_id": "sess_987654",
    "start_balance": 1000000,
    "current_balance": 450000,
    "drop_ratio": 0.55,
    "duration_minutes": 12
  }
}
```

---

## 3. 세션 상태 감지 (EVENT_SESSION_STATUS)

유저의 '몰입(Flow)' 구간을 정의하고, 장기 미활동으로 인한 이탈을 구분합니다.

*   **수집 시점**: 로그인, 게임 플레이, 페이지 이동, 브라우저 종료.
*   **Session Definition**: 마지막 활동(`LastActionTime`)으로부터 **30분** 이내의 활동 묶음.
*   **Logic**:
    *   **Start**: 30분 초과 후 첫 활동 감지 시.
    *   **End**: 마지막 활동 후 30분 경과 시 (Background Worker가 주기적 체크).

### Event Payload (JSON)
```json
{
  "event_type": "SESSION_END",
  "timestamp": 1705483000000,
  "data": {
    "user_id": 1004,
    "session_id": "sess_987654",
    "start_time": 1705481000000,
    "end_time": 1705482800000,
    "total_play_count": 42,
    "total_wager": 3500000
  }
}
```

---

## 4. 데이터 흐름 요약

1.  **Game Server**: 게임 결과/로그인 이벤트 발생.
2.  **Event Publisher**: Redis Pub/Sub 채널(`ch25_events`)로 Payload 발행.
3.  **Analysis Worker (Python)**:
    *   `LOSS_STREAK` 수신 -> Redis 카운터 증가 -> 5 도달 시 `Intervention` 트리거.
    *   `ASSET_DEPLETION` 수신 -> 비율 계산 -> 50% 초과 시 `Intervention` 트리거.
4.  **WebSocket Server**: `Intervention` 메시지 수신 시 클라이언트로 Push.

---

## 5. 운영 SoT (1차 확정)

### A. 일일 예산 캡 (총액)
- 총 예산: **150,000 ~ 200,000원**
- 슬롯: 40% (60~80k)
- 카지노: 40% (60~80k)
- 스포츠: 20% (30~40k)
- 유저 1인/일 캡: **10,000원**

### B. 임계값 (게임별)

**슬롯**
- LOSS_STREAK: 연속 8회 + 최근 30분 베팅합 ≥ 20,000원
- ASSET_DEPLETION: 최근 60분 손실 ≥ 50,000원
- SESSION_END: 30분 무활동

**카지노**
- LOSS_STREAK: 연속 5회 + 최근 30분 베팅합 ≥ 50,000원
- ASSET_DEPLETION: 세션 손실 ≥ 200,000원 또는 최근 60분 손실 ≥ 120,000원
- SESSION_END: 30분 무활동

**스포츠**
- LOSS_STREAK: 연속 3회 미적중 + 일 베팅합 ≥ 100,000원
- ASSET_DEPLETION: 일 손실 ≥ 150,000원
- SESSION_END: 30분 무활동

### C. 자동화/작업장 완화 필터 (일 기준)
- 동일 금액 반복 12회/일 이상 → 당일 제외
- 정확한 주기 반복 8회/일 이상 → 당일 제외
