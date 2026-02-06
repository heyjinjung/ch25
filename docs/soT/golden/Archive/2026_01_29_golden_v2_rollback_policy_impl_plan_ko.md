# Golden V2: Rollback Policy (자동 회수) 구현 계획서 (2026_01_29)

**문서 타입**: 상세 구현 계획 (Implementation Plan)
**작성일**: 2026-01-29
**대상**: Golden V2 개발팀 (Phase 3 - Ops Safety)
**프로젝트**: Golden V2

---

## 1. 개요 (Overview)

개입(Intervention) 실행 후 오발송, 정책 변경, 혹은 어뷰징 발각 시 **지급된 보상을 자동으로 회수(Rollback/Clawback)**하는 시스템입니다.

### 핵심 목표
1.  **Traceability**: 모든 개입 로그(`v2_golden_intervention_log`)는 역추적 가능해야 함.
2.  **Safety**: 회수 시 유저 잔액이 부족할 경우의 처리 정책 ("Debt" vs "Partial") 명확화.
3.  **Automation**: 어드민 원클릭으로 대상 그룹 전체 회수 실행.

---

> [!NOTE]
> **준비 완료**: V2 Golden의 기반 서비스(`VaultService`, `InventoryService`, `CircuitBreakerService`) 및 데이터 모델(`V2User`)이 구축되어 본 계획 실행을 위한 기초 인프라가 확보된 상태입니다.

## 2. 정책 및 로직 (Policy & Logic)

### 2.1 대상 (Target)
- `v2_golden_intervention_log` 테이블에 기록된 특정 `ops_execution_id` 그룹.
- 또는 개별 로그 ID 목록.

### 2.2 회수 정책 (Clawback Strategy)
- **자산 유형별 처리**:
    - `VAULT`: `VaultService.withdraw()` (admin_memo="ROLLBACK:{reason}")
    - `ROULETTE_TICKET` 등: `InventoryService.consume_wallet_tokens()`
    - `ITEM` (기프티콘 등): `InventoryService.consume_item()` (이미 사용된 경우 회수 불가)

- **잔액 부족 시 (Insufficient Balance)**:
    - **Policy A (Default)**: **"회수 가능한 만큼만 회수"** (Partial Clawback).
    - **Policy B (Debt)**: 잔액을 0으로 만들고, 부족분을 별도 `DebtLog`에 기록하여 추후 입금/획득 시 자동 차감 (Phase 4 고려).
    - **V2 초기 결정**: **Policy A** 채택. (Debt 시스템 복잡도 회피)

### 2.3 로그 타입 (InventoryLogType)
- `ROLLBACK_INTERVENTION` (신규 Enum 추가 필요).
- **Alembic 주의**: `op.execute("ALTER TYPE inventorylogtype ADD VALUE 'ROLLBACK_INTERVENTION'")` 필수.

---

## 3. 상세 구현 (Implementation Checklist)

### 3.1 `V2RollbackService`
- `rollback_execution(execution_id: str, admin_id: int)`:
    1.  해당 execution_id의 성공 로그 조회.
    2.  각 로그별로 역방향 액션 수행 (`grant` -> `consume`).
    3.  결과(성공/실패/부분회수) 저장.

### 3.2 Admin API
- `POST /api/v2/admin/ops/executions/{id}/rollback`
    - Permission: `SUPER_ADMIN` Only.
    - Response: `{ "total": 100, "success": 95, "failed": 5, "partial": 0 }`

### 3.3 예외 처리
- **이미 사용된 기프티콘**: 외부 연동 확인 불가 시 회수 실패(`ALREADY_USED`) 처리.
- **이미 회수된 건**: 중복 회수 방지 (`is_rolled_back` 플래그 체크).

---

## 4. 데이터 모델 변경
- `v2_golden_intervention_log` 테이블에 `rolled_back_at` (DateTime, Nullable) 컬럼 추가.

## 5. 결론
Rollback Policy는 운영자의 심리적 부담을 줄여 적극적인 개입을 가능하게 하는 안전망입니다.
