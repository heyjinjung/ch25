문서 타입: 운영 정책/규격
버전: v1.1
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 운영/개발 팀
상태: SoT

# Golden V2 Operational Logic (운영 및 관제 로직)

## 1. 목적
Golden System의 안정적인 운영을 위한 **관제(Operations)**, **로깅(Logging)**, **안전장치(Safety Mechanisms)**를 정의한다. 시스템의 자동화 수준이 높아짐에 따라 투명성과 통제 가능성(Controllability)이 필수적이다.

## 2. Ops Log Schema (운영 로그 스키마)
모든 Golden 개입(Intervention)과 관리자 액션은 반드시 표준화된 로그 포맷으로 기록되어야 한다.

### 2.1. Golden Action Log
| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `log_id` | UUID | 로그 고유 식별자 | `550e8400-e29b...` |
| `timestamp` | ISO8601 | 발생 시각 (UTC) | `2026-01-19T12:00:00Z` |
| `actor` | String | 행위자 (System or Admin ID) | `SYSTEM:RETENTION_ENGINE` |
| `target_user_id` | Int | 대상 유저 ID | `10045` |
| `action_type` | Enum | 액션 유형 | `GIVE_REWARD`, `CHANGE_DIFFICULTY` |
| `trigger_id` | String | 발동 원인 규칙 ID | `TRG_LOSE_5` |
| `payload` | JSON | 상세 내용 (Before/After) | `{"reward": "ticket_x1", "cost": 0}` |
| `status` | Enum | 처리 결과 | `SUCCESS`, `FAIL`, `SKIPPED` |

---

## 3. Safety Mechanisms (안전장치)

### 3.1. Circuit Breaker (서킷 브레이커)
오동작으로 인한 과다 지급이나 시스템 부하를 방지한다.
- **Global Limit**: 전체 유저 대상 재화 지급 총량이 시간당 `X`를 초과하면 자동 중단.
- **Error Rate**: 개입 실패율/에러율이 5% 초과 시 시스템 일시 정지(Pause).
- **Manual Override**: 운영자가 언제든 대시보드에서 `Emergency Stop`을 누를 수 있어야 함.

### 3.2. Rollback Policy (롤백 정책)
- **Soft Rollback**: 지급된 미사용 재화(우편함 등) 회수.
- **Hard Rollback**: (심각한 경우) 특정 시점으로 데이터 복원. 단, 이는 최후의 수단이며 Golden System은 기본적으로 **보상 회수 로직(Compensate Transaction)**을 구현해야 한다.

---

## 4. Dashboard Requirements (대시보드 요구사항)
SoT `v2_ops_plan_execution_schema`와 연동되는 시각화 요구사항이다.

### 4.1. Real-time Status
- 현재 활성화된 트리거 목록 및 발동 횟수 (Real-time Counter)
- 시간당 지급된 보상 총액 가치 (Burn Rate)
- 에러/경고 발생 현황

### 4.2. Intervention History
- 유저별 개입 이력 타임라인 뷰.
- "왜 이 유저에게 이 보상이 지급되었는가?"를 역추적(Trace) 할 수 있어야 함.

---

## 5. SoT 확장 (2026-01-28)

### 5.1 Ops Plan Action Kinds (실행 엔진 연동)

| Kind(SoT) | 설명 | 처리 방식(의도) |
| :--- | :--- | :--- |
| `INVENTORY_GRANT_ALL` | 전체 유저 일괄 지급 | Async Worker |
| `TARGETED_ITEM_GRANT` | 타겟 리스트 대상 지급 | Async Worker |
| `GOLDEN_HOUR` | 골든아워 상태 제어 | Redis Pub/Sub |
| `TARGETLIST_BROADCAST` | 타겟 리스트 상태/뱃지 마킹 | Sync/Async |
| `MESSAGE_TEMPLATE` | 메시지 템플릿 발송 | Async Worker |

### 5.2 Pub/Sub 채널 SoT (운영 관점)

| 채널 | 목적 |
| :--- | :--- |
| `golden:v2:admin:queue` | 승인 대기열(운영자 UI) 실시간 갱신 |
| `golden:v2:config:updates` | 설정/상태 변경 즉시 반영(골든아워 포함) |

### 5.3 Admin 실시간 스트림 엔드포인트 SoT

| 구분 | 엔드포인트 | 설명 |
| :--- | :--- | :--- |
| Admin WebSocket | `/api/admin/ws/golden/events` | 대시보드 이벤트 스트림 |

---

## 6. 변경 이력
- v1.1 (2026-01-28, GitHub Copilot): OpsPlan Action Kinds/채널/엔드포인트 SoT 확장(운영 관제 정합).
- v1.0 (2026-01-19): 최초 작성. 기존 `04_report`, `02_tech_spec` 내용을 기반으로 표준화.
