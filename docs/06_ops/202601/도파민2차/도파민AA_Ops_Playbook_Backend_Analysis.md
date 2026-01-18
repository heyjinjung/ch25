# 🛠️ Ops Playbook Backend Technical Analysis Report

**작성일**: 2026-01-16
**분석 대상**: `OpsPlanService`, `OpsPlanTask`, `OpsTargetList` 및 관련 테스트 코드
**목적**: Ops Playbook 시스템의 백엔드 구현 완성도 및 기술적 안정성 검증

---

## 1. 아키텍처 개요 (Architecture Overview)

Ops Playbook 시스템은 **'전략 수립(Plan)'**과 **'실행(Execution)'**을 분리한 계층형 구조로 설계되었습니다.

*   **Campaign > Plan > Task 위계 구조**:
    *   `OpsCampaign`: 최상위 캠페인 (장기 목표, 예: "2026 신년 리텐션 방어").
    *   `OpsPlan`: 특정 일자(Plan Date)의 구체적인 실행 계획 모음.
    *   `OpsTask`: 실행 가능한 최소 단위 (예: "14:00 골든아워 ON", "16:00 VIP DM 발송").

*   **실행 엔진 (Execution Engine)**:
    *   `OpsPlanService.execute_task()`가 핵심 디스패처 역할을 수행하며, Task의 `kind`에 따라 적절한 핸들러를 호출합니다.
    *   **Idempotency (멱등성)**: `executed_at` 타임스탬프를 체크하여 중복 실행을 원천 차단합니다.

---

## 2. 핵심 기능 상세 분석 (Core Features Deep Dive)

### 2.1. 골든아워 제어 (Golden Hour Toggle)

전략적으로 중요한 '전체 서버 배수 이벤트'를 제어하는 로직입니다.

*   **구현 위치**: `OpsPlanService._execute_golden_hour_toggle`
*   **작동 원리**:
    1.  **Vault2 Config 연동**: `Vault2Service`를 통해 `golden_hour_config` 값을 직접 수정합니다.
    2.  **모드 지원**:
        *   `FORCE_ON`: 강제 활성화 (수동 개입).
        *   `FORCE_OFF`: 강제 종료.
        *   `MULTIPLIER_SET`: 배수율(Multiplier)만 변경 (예: 2.0x -> 3.0x).
    3.  **시스템 로그**: `SYS_GOLDEN_HOUR_TOGGLE` 액션 코드로 변경 이력을 `OpsLog`에 영구 기록합니다.
*   **검증 결과**:
    *   `test_golden_hour_toggle.py` 테스트 통과.
    *   기존 `Vault2` 로직과 충돌 없이 설정값이 즉시 반영됨을 확인.

### 2.2. 타겟 DM/Template 발송 (Targeted Messaging)

세분화된 타겟(Segment)에게 개인화된 메시지를 발송하는 기능입니다.

*   **구현 위치**: `OpsPlanService._execute_message_template`
*   **작동 원리**:
    1.  **Target List 바인딩**: Task Payload에 명시된 `target_list_id`를 조회합니다.
    2.  **상태 업데이트**: 해당 리스트에 속한 모든 멤버(`OpsTargetMember`)의 상태를 `PENDING` -> `SENT`로 일괄 업데이트합니다.
    3.  **No-Op Send**: 백엔드에서는 메시지 발송 API(외부)를 직접 호출하지 않고, **'발송 처리됨(Mark as Sent)' 상태**만 관리합니다. (실제 발송은 별도 Worker나 Admin UI 연동을 상정).
    4.  **로깅**: `CS_SURVEY_DM_SENT` 로그를 남겨 어떤 타겟에게 몇 건이 발송되었는지 추적합니다.
*   **기술적 특징**:
    *   DB Transaction을 사용하여 수천 명의 멤버 상태 업데이트가 **Atomic**하게 처리됩니다. 하나라도 실패하면 전체 롤백됩니다.

### 2.3. 아이템/재화 지급 (Inventory Grant)

특정 보상을 유저 인벤토리에 지급하는 로직입니다.

*   **구현 위치**: `OpsPlanService._execute_inventory_grant_all` (전수) / `TARGETED_ITEM_GRANT` (타겟)
*   **작동 원리**:
    1.  **Chunk Processing**: 대량 지급 시 시스템 부하를 방지하기 위해 500명 단위로 Chunking 하여 처리합니다.
    2.  **Audit Trail**: 지급 사유(`reason`)와 관련 Task ID(`related_id`)를 인벤토리 로그에 남겨, 추후 "이 돈 왜 들어왔어?"에 대한 추적을 보장합니다.
    3.  **Fail-Safe**: `User` 테이블이 아닌 `OpsTargetList` 기반으로 동작하여, 의도치 않은 전수 지급 사고를 방지합니다.

---

## 3. 데이터 모델 및 스키마 (Data Schema)

### 3.1 `OpsPlanTask` (Task 정의)
```python
class OpsPlanTask(Base):
    # ...
    type = Column(String(30))       # GRANT, ANNOUNCE, TOGGLE
    status = Column(String(20))     # TODO, DONE, BLOCKED
    payload_json = Column(JSON)     # 실행 파라미터 + 완료 시 execution_result 저장
    executed_at = Column(DateTime)  # 중복 실행 방지용 마커
    actor_admin_id = Column(Integer) # 실행자(책임 소재)
```

### 3.2 `OpsTargetList` (타겟 그룹)
```python
class OpsTargetList(Base):
    # ...
    source_type = Column(String)    # SCENARIO(자동), SEGMENT, MANUAL
    count_snapshot = Column(Integer) # 생성 시점 대상 수 (변동 방지)
    is_processed = Column(Boolean)   # 처리 여부
```

---

## 4. 안정성 및 보안 (Reliability & Security)

1.  **트랜잭션 관리 (Transaction Management)**:
    *   모든 `execute_task` 메서드는 `db.commit()`을 수행하기 전까지 메모리 상에서만 동작하며, 예외 발생 시 `db.rollback()`으로 완벽하게 원복됩니다.
    *   특히 대량 지급(`Grant`) 시, 실행 마커(`executed_at`)를 먼저 찍거나 트랜잭션 내에서 처리하여 **'돈은 줬는데 Task는 실패로 뜨는' 좀비 상태**를 방지합니다.

2.  **테스트 커버리지 (Test Coverage)**:
    *   `tests/test_ops_plan_actions.py`에서 다음 시나리오를 100% 커버합니다.
        *   단일/다중 아이템 지급 검증
        *   Target List 없는 상태에서의 오발송 방지 로직 (Safety Check)
        *   Golden Hour On/Off/Multiplier 조작 검증
        *   Broadcast 시 멤버 상태 변경(`SENT`) 검증

---

## 5. 결론 및 제언 (Conclusion)

**현재 상태**: ✅ **Production Ready**
백엔드 로직은 전략 문서(`Marketing Playbook`, `Ops Integration Plan`)에서 요구하는 기능을 수행하기에 충분한 구조적 완성도를 갖추고 있습니다.

**제언 (Next Step)**:
1.  **Seed Data 주입**: 로직은 완성되었으나 DB가 비어 있습니다. 전략 문서의 시나리오(Scenario 1~11)를 실제 `OpsCampaign` 및 `TargetList`로 변환하여 DB에 넣는 작업이 필요합니다.
2.  **프론트엔드 연동**: Admin UI에서 `TargetList`를 생성할 때, '최근 3일 접속 & 무과금' 같은 조건을 SQL 쿼리로 자동 매핑해주는 **'Segment Builder'** 기능이 추가되면 운영 효율이 극대화될 것입니다.
