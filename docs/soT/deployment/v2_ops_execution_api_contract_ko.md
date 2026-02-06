문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 1. 목적 (Purpose)
Ops 실행 결과 저장/조회 API 계약과 어드민 연동 범위를 정의한다.

## 2. 범위 (Scope)
- 실행 결과 저장 API
- 실행 결과 조회 API
- 어드민 화면 연동 범위

## 3. 저장 규칙 (Storage Rule)
- 실행 결과는 `ops_plan_task.payload_json["execution_result"]` 또는 `v2_ops_execution_result`에 저장한다.
- 결과 구조는 [v2_ops_plan_execution_schema_sot_ko.md](./v2_ops_plan_execution_schema_sot_ko.md#L1)을 따른다.

## 4. API 계약 (Contract)
### 4.1 결과 저장
- Endpoint: `POST /admin/api/ops/tasks/{task_id}/execution-result`
- Request:
```json
{
  "kind": "INVENTORY_GRANT_ALL",
  "timestamp": 1705623000000,
  "worker_id": "worker-1",
  "execution_error": null,
  "items": [
    {"item_type": "ROULETTE_TICKET", "amount": 5}
  ],
  "target": "ALL_USERS",
  "granted_users": 1523,
  "async_task_id": "uuid..."
}
```
- Response:
```json
{
  "saved": true
}
```

### 4.2 결과 조회
- Endpoint: `GET /admin/api/ops/tasks/{task_id}/execution-result`
- Response:
```json
{
  "kind": "INVENTORY_GRANT_ALL",
  "timestamp": 1705623000000,
  "worker_id": "worker-1",
  "execution_error": null,
  "items": [
    {"item_type": "ROULETTE_TICKET", "amount": 5}
  ],
  "target": "ALL_USERS",
  "granted_users": 1523,
  "async_task_id": "uuid..."
}
```

## 5. 어드민 연동 범위
- Ops Task 상세 모달에 **실행 결과 패널** 추가
- `execution_error` 존재 시 경고 배지 표시
- `granted_users`, `async_task_id`를 요약 표시

## 6. 검증 (QA)
- [ ] 실행 결과 저장/조회 정상 동작
- [ ] `kind` 별 필드 누락 시 4xx 반환
- [ ] `execution_error` 표시/로그 확인

## 7. 근거 (Source)
- Ops 실행 결과 스키마 SoT: [docs/v2_specs/05_ops/v2_ops_plan_execution_schema_sot_ko.md](./v2_ops_plan_execution_schema_sot_ko.md#L1)

## 8. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
