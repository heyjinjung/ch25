# V2 운영 액션 용어집 (Ops Action Glossary SoT)

**문서 타입**: 용어집(Glossary) / V2 SoT
**버전**: v2.0
**작성일**: 2026-01-19
**상태**: SoT (Source of Truth)
**프로젝트**: Golden V2

---

## 1. 목적 (Purpose)
- V2 Ops Plan에서 사용되는 **실행 액션(Action Kind)**의 정의와 동작 방식을 표준화합니다.
- 각 액션의 처리 주체(Worker vs Sync)와 영향 범위를 명시합니다.

## 2. 범위 (Scope)
- Admin Ops Plan 기능 전반
- Backend `OpsPlanService` 및 Worker 로직

---

## 3. 액션 용어 정의 (Definitions)

### 3.1 지급/회수 (Grant & Revoke)

| 용어 | Enum (Kind) | 설명 | 처리 방식 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **전체 일괄 지급** | `INVENTORY_GRANT_ALL` | 전체 유저(`ALL_USERS`)에게 아이템/재화를 지급합니다. | **Async Worker** | 부하가 크므로 반드시 큐를 통해 처리. |
| **타겟 리스트 지급** | `TARGETED_ITEM_GRANT` | 특정 타겟 리스트(`TargetList`)에 포함된 유저에게만 지급합니다. | **Async Worker** (권장) | 대상이 1000명 이상일 경우 Worker 처리. |
| **개별 지급(테스트)** | `SINGLE_USER_GRANT` | 특정 유저 1명에게 지급합니다 (Admin 수동). | Sync | 테스트/CS 용도. |

### 3.2 상태 제어 (Status Control)

| 용어 | Enum (Kind) | 설명 | 처리 방식 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **골든아워 제어** | `GOLDEN_HOUR` | 서버 전체의 배율/이벤트 상태를 변경합니다. | **Redis Pub/Sub** | 즉시 전파 필요. |
| **타겟 상태 마킹** | `TARGETLIST_BROADCAST` | 타겟 리스트 멤버의 상태를 `SENT`로 변경합니다 (실제 발송 없음). | Sync/Async | 외부 발송 후 상태 동기화용. |

### 3.3 메시징 (Messaging)

| 용어 | Enum (Kind) | 설명 | 처리 방식 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **메시지 템플릿 발송** | `MESSAGE_TEMPLATE` | 정의된 템플릿으로 메시지/DM을 발송합니다. | **Async Worker** | 텔레그램 API Rate Limit 고려 필수. |
| **설문 DM 발송** | `SURVEY_DM` | 설문조사 링크가 포함된 DM을 발송합니다. | **Async Worker** | |

---

## 4. 데이터/파라미터 표준 (Standards)

### 4.1 타겟 (Target)
- **`ALL_USERS`**: `user_status='ACTIVE'`인 모든 유저. (`INACTIVE` 제외 정책 적용 가능)
- **`TARGET_LIST:{id}`**: `target_list` 테이블의 특정 그룹.

### 4.2 실행 보장 (Consistency)
- `INVENTORY_GRANT_ALL`은 **멱등성(Idempotency)** 보장이 권장됩니다. (Task ID 기준 중복 지급 방지)
- `TARGETLIST_BROADCAST`는 마킹 작업이므로 실패 시 재시도 가능합니다.

---

## 5. 운영/검증 (QA)
- [ ] Worker가 `INVENTORY_GRANT_ALL` 메시지를 정상 수신하는지 확인
- [ ] 대량 지급 시 DB Deadlock 방지 로직(Chunking) 확인

## 6. 변경 이력
- v2.0 (2026-01-19, GitHub Copilot): 초기 작성. `INVENTORY_GRANT_ALL` 등 핵심 용어 정의.
