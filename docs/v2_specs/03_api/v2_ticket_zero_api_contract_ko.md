문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
Ticket Zero(긴급 구호) API 계약을 정의한다.

## 2. 범위 (Scope)
- 상태 조회 응답 플래그
- 구조 요청 API
- 조건 검증(잔액/미수령/쿨다운)

## 3. 사전 조건 (Eligibility)
- `POINT` 및 `Ticket` 잔액이 모두 0
- 미수령 보상/우편함 아이템 없음
- 최근 수령 후 24시간 경과

## 4. API 계약 (Contract)
### 4.1 상태 조회
- Endpoint: `GET /status`
- Response:
```json
{
  "bailout_available": true
}
```

### 4.2 구조 요청
- Endpoint: `POST /api/retention/bailout`
- Request:
```json
{}
```
- Response:
```json
{
  "granted": true,
  "ticket_type": "ROULETTE_TICKET",
  "ticket_amount": 1
}
```

## 5. 실패 응답 (Failure)
- 잔액/미수령/쿨다운 조건 불충족 시 `granted=false` 또는 4xx 에러 반환

## 6. 테스트 초안 (Test Cases)
- 조건 충족 시 `bailout_available=true`
- 잔액 > 0 시 `bailout_available=false`
- 미수령 보상 존재 시 `bailout_available=false`
- 쿨다운 미경과 시 `bailout_available=false`

## 7. 근거 (Source)
- 티켓 제로 정책 SoT: [docs/v2_specs/02_game/v2_ticket_zero_policy_sot_ko.md](../02_game/v2_ticket_zero_policy_sot_ko.md#L1)

## 8. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
