문서 타입: API 계약
버전: v1.0
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
- Ops 실행 결과 저장/조회

## 3. API 계약 (Contract)
### 3.1 세그먼트 배치 실행
- Endpoint: `POST /api/v2/segments/run`
- Response:
```json
{ "processed": 0, "updated": 0 }
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
  "title": "공지",
  "content": "내용",
  "target_type": "ALL",
  "target_value": null,
  "channels": ["INBOX"],
  "created_at": "2026-01-19T12:00:00"
}
```

### 3.3 Ops 실행 결과 저장/조회
- Endpoint: `POST /admin/api/ops/tasks/{task_id}/execution-result`
- Endpoint: `GET /admin/api/ops/tasks/{task_id}/execution-result`

## 4. 근거 (Source)
- 운영 메시지 정책 SoT: [docs/v2_specs/05_ops/v2_admin_message_policy_sot_ko.md](../05_ops/v2_admin_message_policy_sot_ko.md#L1)
- Ops 실행 결과 계약: [docs/v2_specs/05_ops/v2_ops_execution_api_contract_ko.md](../05_ops/v2_ops_execution_api_contract_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
