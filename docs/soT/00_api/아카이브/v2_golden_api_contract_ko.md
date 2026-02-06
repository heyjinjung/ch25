문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: Draft

## 1. 목적 (Purpose)
Golden V2 개입/리텐션 API 계약을 정의한다.

## 2. 범위 (Scope)
- 개입 결정(Intervention Resolve)
- 재참여 큐(Reengagement Queue)

## 3. 엔드포인트 (Endpoints)
### 3.1 개입 결정
- **POST** `/api/v2/golden/intervention/resolve`
- 요청
```json
{
  "event_type": "LOSS_STREAK",
  "data": {
    "loss_streak": 5,
    "balance": 0
  }
}
```
- 응답
```json
{
  "eligible": true,
  "experiment_group": "TREATMENT",
  "reward_type": "POINT",
  "reward_amount": 3000,
  "capped_amount": 3000,
  "cmax": 5000,
  "predicted_ltv": 120000,
  "roi_percent": 320.0,
  "meta": {}
}
```

### 3.2 재참여 큐
- **POST** `/api/v2/golden/reengagement/queue`
- 요청
```json
{
  "reason": "DORMANT_7D",
  "channel": "IN_APP"
}
```
- 응답
```json
{
  "queued": true,
  "created": true,
  "reason": "DORMANT_7D",
  "meta": {}
}
```

## 4. 오류 규칙 (Errors)
- `INVALID_EVENT_TYPE`
- `INTERVENTION_DISABLED`

## 5. 비고 (Notes)
- 현재 구현은 V1 경로(`/api/retention/*`)에 존재하며, V2 라우트는 이관 필요.

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
