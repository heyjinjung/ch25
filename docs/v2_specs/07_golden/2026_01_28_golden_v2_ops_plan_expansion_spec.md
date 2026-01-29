# Golden V2: Ops Plan 시스템 확장 설계서 (Expansion Spec)

**작성일**: 2026-01-28
**버전**: v1.2
**상태**: ✅ Verified (Core Engine Ready)
**대상**: BE 개발팀 / 운영팀

---

## 1. 개요 (Overview)
기존의 Ops Plan 시스템은 캠페인과 플랜의 CRUD 위주였으나, 골든 V2의 '유연한 운영(Flexible Ops)'을 위해 실제 실행 엔진(Execution Engine)의 고도화가 필요합니다. 본 문서는 주요 5가지 액션(Action Kinds)의 기술적 구현 및 확장 계획을 다룹니다.

---

## 2. 액션별 상세 기술 스펙 (Action Kinds)

### 2.1 INVENTORY_GRANT_ALL (전체 유저 일괄 지급)
- **목적**: 대규모 이벤트나 사과 보상 시 전 유저 대상 아이템/재화 지급.
- **구현 방식**: 
    - `OpsPlanTask.payload_json`에 아이템 코드 및 수량 정의.
    - **Async Worker**: 유저 수가 많으므로 Celery/Redis를 통해 배치 처리. 
    - **Circuit Breaker**: 지급 중 비정상적인 Burn Rate 감지 시 자동 중단 로직 연동.

### 2.2 TARGETED_ITEM_GRANT (타겟 리스트 대상 지급)
- **목적**: 특정 코호트(예: 이탈 위험군, 고액 유저) 대상 타겟팅 보상.
- **구현 방식**: 
    - `ops_target_list` 및 `ops_target_member` 테이블과 연동.
    - `PENDING` 상태의 멤버들을 순회하며 `V2AdminInventoryService` 호출.
    - 개별 유저별 성공/실패 상태를 `ops_target_member.status`에 업데이트.

### 2.3 GOLDEN_HOUR (골든아워 상태 제어)
- **목적**: 특정 시간대 보너스 부스팅 상태 실시간 제어.
- **구현 방식**: 
    - **DB Config 업데이트**: Vault2Config의 `golden_hour_config`를 업데이트하여 즉시 반영.
    - `ops_plan_task.payload_json`:
        - `{"action": "FORCE_ON", "send_feed": true}`
        - `{"action": "FORCE_OFF"}`
        - `{"action": "MULTIPLIER_SET", "multiplier": 2.0}`

### 2.4 TARGETLIST_BROADCAST (타겟 리스트 상태 마킹)
- **목적**: 특정 유저 그룹에게 '특별 타겟팅' 뱃지나 지위를 부여하여 심리적 변화 유도.
- **구현 방식**: 
    - `V2UserRetentionState` 모델의 특정 플래그 업데이트.
    - TMA 진입 시 "귀하는 이번 특별 케어 대상자로 선정되었습니다" 알림 노출을 위한 데이터 마킹.

### 2.5 MESSAGE_TEMPLATE (메시지 템플릿 발송)
- **목적**: 텔레그램 봇을 통한 개인화된 케어 메시지 대량 발송.
- **구현 방식**: 
    - `App/bot` 서비스와 연동.
    - 템플릿 코드 및 변수(`{user_name}`, `{bonus_amount}`) 치환 로직.
    - **Delayed Sending**: TMA 부하 분산을 위한 순차 발송 엔진 적용.

---

## 3. 실행 엔진 통합 (Execution Integration)

### 3.1 Task Execution Flow
1. **Trigger**: Admin UI에서 `execute_task` 호출.
2. **Dispatch**: `V2AdminOpsPlanService.execute_task`에서 `kind`에 따라 적절한 서비스/워커 호출.
3. **Log**: 실행 결과를 `V2OpsExecutionResult`에 아카이빙하고 ROI 파이프라인(Phase 1)과 연결.
4. **Verified**: `test_golden_v2_integrated.py`를 통해 Auth-Asset-CircuitBreaker 기반의 실행 흐름이 검증됨.

---

## 4. 데이터 정합성 및 안전장치 (Safety)
- **Idempotency**: 동일 Task 중복 실행 방지 (DB `executed_at` 체크).
- **Rollback**: 일괄 지급 실패 시 트랜잭션 단위가 아닌 유저 단위의 복구 로그 생성.

---

## 5. 변경 이력
- v1.2 (2026-01-29): 통합 연동 테스트 성공 결과 반영 및 상태 'Verified' 갱신.
- v1.1 (2026-01-28): GOLDEN_HOUR 구현/페이로드를 현행 코드(OpsPlanService) 기준으로 정합화.
- v1.0 (2026-01-28): Ops Plan 시스템 5대 액션 확장 계획 수립.
