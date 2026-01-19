문서 타입: API 계약
버전: v1.3
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 Admin/Ops API 계약

## 1. 목적 (Purpose)
운영/어드민 기능의 V2 API 계약을 정의한다.

## 2. 범위 (Scope)
- 세그먼트 배치 실행
- 운영 메시지 생성/팬아웃
- 인박스 조회/읽음 처리
- Ops 실행 결과 저장/조회

## 3. API 계약 (Contract)
### 3.1 세그먼트 배치 실행
- Endpoint: `POST /api/v2/segments/run`
- Response:
```json
{ "processed": 0, "changed": 0 }
```

### 3.2 운영 메시지 생성/팬아웃
- Endpoint: `POST /api/v2/messages`
- Request:
```json
{
  "title": "공지",
  "content": "내용",
  "target_type": "ALL",
  "target_value": null,
  "channels": ["INBOX"]
}
```
- Response:
```json
{
  "id": 1,
  "sender_admin_id": 0,
  "title": "공지",
  "content": "내용",
  "target_type": "ALL",
  "target_value": null,
  "channels": ["INBOX"],
  "recipient_count": 0,
  "read_count": 0,
  "created_at": "2026-01-19T12:00:00"
}
```

### 3.3 인박스 조회
- Endpoint: `GET /api/v2/inbox`
- Query Parameters:
  - `limit`: (optional) 조회할 메시지 수 (기본값: 50)
  - `offset`: (optional) 오프셋 (기본값: 0)
- Response:
```json
{
  "messages": [
    {
      "id": 1,
      "message_id": 10,
      "title": "공지",
      "content": "내용",
      "is_read": false,
      "read_at": null,
      "created_at": "2026-01-19T12:00:00"
    }
  ],
  "unread_count": 1
}
```

### 3.4 인박스 읽음 처리
- Endpoint: `PATCH /api/v2/inbox/read`
- Request:
```json
{
  "inbox_ids": [1, 2, 3]
}
```
- Response:
```json
{
  "marked_count": 3,
  "remaining_unread": 0
}
```

### 3.5 Ops 실행 결과 저장/조회
- Endpoint: `POST /admin/api/ops/tasks/{task_id}/execution-result`
- Endpoint: `GET /admin/api/ops/tasks/{task_id}/execution-result`

## 4. 근거 (Source)
- 운영 메시지 정책 SoT: [docs/v2_specs/05_ops/v2_admin_message_policy_sot_ko.md](../05_ops/v2_admin_message_policy_sot_ko.md#L1)
- Ops 실행 결과 계약: [docs/v2_specs/05_ops/v2_ops_execution_api_contract_ko.md](../05_ops/v2_ops_execution_api_contract_ko.md#L1)

## 5. 변경 이력
- v1.3 (2026-01-19, GitHub Copilot): 인박스 조회/읽음 처리 API 계약 추가 (GET /inbox, PATCH /inbox/read)
- v1.2 (2026-01-19, GitHub Copilot): POST /messages 응답에 누락 필드 추가 (sender_admin_id, recipient_count, read_count)
- v1.1 (2026-01-19, GitHub Copilot): 세그먼트 배치 응답 필드명 수정 (updated → changed)
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
