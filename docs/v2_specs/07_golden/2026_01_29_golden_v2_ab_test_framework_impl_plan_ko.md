# Golden V2: A/B Test Framework 구현 계획서 (2026_01_29)

**문서 타입**: 상세 구현 계획 (Implementation Plan)
**작성일**: 2026-01-29
**대상**: Golden V2 개발팀 (Phase 3+ - Optimization)
**프로젝트**: Golden V2

---

## 1. 개요 (Overview)

동일한 개입 목표(예: 주말 리텐션 증대)에 대해 서로 다른 **전략(보상 종류, 메시지 문구, 발송 시각)**을 적용하여 **어떤 개입이 가장 효과적인지 정량적으로 측정**하는 프레임워크입니다.

### 핵심 목표
1.  **Split Control**: 타겟 세그먼트를 무작위(Random) 또는 조건부로 A/B/Control 그룹으로 분할.
2.  **Configuration**: 코드 배포 없이 어드민에서 실험군 설정.
3.  **Isolation**: 실험 간 간섭 방지.

---

## 2. 기술 설계 (Technical Design)

### 2.1 실험 그룹 할당 (Bucket Assignment)
- **Hash Based**: `hash(user_id + experiment_salt) % 100` 방식으로 결정론적(Deterministic) 그룹 할당. 별도 DB 저장 불필요.
- **V2SegmentRule 확장**:
    - `experiment_group`: "A" | "B" | "Control"
    - `traffic_allocation`: 0~100 (예: A=30, B=30, Control=40)

### 2.2 실행 로직
- **`V2OpsTargetingService`**:
    - `get_targets(rule_id)` 호출 시, 룰에 실험 설정이 있다면 Hash 로직을 통해 그룹 필터링 수행.
    - 예: Rule A (Group A, 0-30), Rule B (Group B, 30-60).

### 2.3 데이터 추적
- `v2_golden_intervention_log`에 `experiment_group` 컬럼 추가 필요?
    - **대안**: `ops_plan_id` 자체가 실험군을 대변하므로(Plan A, Plan B), 별도 컬럼 없이 Plan 단위로 분석 가능.
    - **결정**: **Plan 단위 분리** 권장. (구현 복잡도 최소화)
        - Ops Plan "Weekend Retention - Group A"
        - Ops Plan "Weekend Retention - Group B"

---

## 3. 상세 구현 (Implementation Checklist)

### 3.1 `V2ExperimentService`
- `assign_group(user_id: int, salt: str) -> str`:
    - "A", "B", "C" 등 그룹 반환 유틸리티.

### 3.2 Admin UI
- **Ops Plan 생성 시 "A/B Test 모드" 지원**:
    - 모계획(Parent Plan) 생성 후 자식 계획(Child Plans) 자동 생성.
    - 타겟 유저군 자동 쪼개기 설정.

---

## 4. 운영 시나리오
1.  운영자가 "주말 리텐션" 캠페인 생성.
2.  A/B 테스트 체크 -> A안(티켓 1장), B안(티켓 3장) 설정.
3.  시스템이 내부적으로 2개의 Ops Plan 생성 및 트래픽 50:50 할당.
4.  ROI Calculator가 각 Plan별 성과 측정.

## 5. 결론
V2 초기에는 복잡한 Feature Flag 툴 대신, **Ops Plan을 분할하고 User ID Hash로 타겟팅을 나누는 방식**이 가장 가볍고 효율적입니다.
