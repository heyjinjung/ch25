# V2 OPS Plan 실행 결과 스키마 (Ops Plan Execution Result Schema)

**문서 타입**: API 스키마 / 운영 표준 / V2 SoT
**버전**: v2.0
**작성일**: 2026-01-18
**상태**: SoT (Source of Truth)
**프로젝트**: Golden V2

---

## 1. 목적 (Purpose)
- V2 Admin/Ops Plan 실행 시 `OpsPlanService`가 `payload_json["execution_result"]`에 기록하는 결과 구조를 정의합니다.
- V2의 **비동기 Worker** 아키텍처와 **표준 경제 용어**(`*_TICKET`, `cc_deposit`)를 반영합니다.

## 2. 적용 범위 (Scope)

### 2.1 대상 액션 (Action Kinds)
1.  **INVENTORY_GRANT_ALL** - 전체 사용자 일괄 지급 (Heavy Task -> Worker 권장)
2.  **TARGETED_ITEM_GRANT** - 타겟 리스트 대상 지급
3.  **TARGETLIST_BROADCAST** - 타겟 리스트 상태 마킹 (`SENT`)
4.  **GOLDEN_HOUR** - 골든아워 상태 제어
5.  **MESSAGE_TEMPLATE** / **SURVEY_DM** - 메시지 발송 마킹

### 2.2 저장 위치
- **DB**: `ops_plan_task.payload_json["execution_result"]`
- **Redis (Optional)**: `golden:v2:ops:result:{task_id}` (실시간 진행률 노출 시)

---

## 3. 공통 구조 (Common Schema)

### 3.1 기본 봉투 (Envelope)
```json
{
  "kind": "<ACTION_KIND>",
  "timestamp": 1705623000000, // (V2 추가) 실행 완료 시각
  "worker_id": "worker-1",    // (V2 추가) 처리한 워커 ID
  // ... 액션별 필드
}
```

### 3.2 에러 처리
**V2 변경점**: 모든 액션에 대해 에러 필드를 표준화합니다.

```json
{
  "execution_error": {
    "code": "OPS_GRANT_FAILED",
    "message": "아이템 지급 중 DB 트랜잭션 오류 발생",
    "details": "..."
  }
}
```

---

## 4. 액션별 응답 스키마 (Action Schemas)

### 4.1 INVENTORY_GRANT_ALL
**목적**: 전체 지급. V2에서는 Worker가 청크 단위로 처리할 수 있음.

```json
{
  "kind": "INVENTORY_GRANT_ALL",
  "reason": "OPS_PLAN_GRANT_ALL",
  "items": [
    {
      "item_type": "DIAMOND",
      "amount": 1000
    },
    {
      "item_type": "ROULETTE_TICKET", // (V2) Enum 표준화 확인 (COIN -> TICKET)
      "amount": 5
    }
  ],
  "target": "ALL_USERS",
  "granted_users": 1523,
  "async_task_id": "uuid..." // (V2) 비동기 작업 ID
}
```

### 4.2 TARGETED_ITEM_GRANT
**목적**: 타겟 리스트 지급.

```json
{
  "kind": "TARGETED_ITEM_GRANT",
  "granted_users": 247,
  "items": [
    {
      "item_type": "VOUCHER_DICE", // (V2) 바우처 네이밍 정책 확인 필요
      "amount": 3
    }
  ]
}
```

### 4.3 GOLDEN_HOUR
**목적**: 골든아워 제어. Redis Pub/Sub으로 전체 서버에 전파됨.

```json
{
  "kind": "GOLDEN_HOUR",
  "action": "FORCE_ON",
  "multiplier": 2.0,
  "enabled": true,
  "manual_override": "FORCE_ON",
  "propagated_to_redis": true // (V2) Redis 전파 성공 여부
}
```

---

## 5. 검증 및 주의사항 (Validation)

1.  **경제 용어 준수**: `ticket_type`은 반드시 `v2_ticket_enum_sot_ko.md`에 정의된 `ROULETTE_TICKET`, `DICE_TICKET` 등을 사용해야 합니다. (Legacy `COIN`/`TOKEN` 사용 금지)
2.  **비동기 결과**: 대량 지급(`GRANT_ALL`)은 즉시 완료되지 않을 수 있으며, 이 경우 `execution_result`에는 "작업 시작됨" 상태만 기록되고 최종 통계는 별도 로그로 남을 수 있습니다.

## 6. 변경 이력
- v2.0 (2026-01-18, GitHub Copilot): V2 아키텍처 반영 및 문서 표준화.
- v1.2 (2026-01-15): 기존 V1 스키마 (`2026_ops_plan_execution_result_schema.md`)
