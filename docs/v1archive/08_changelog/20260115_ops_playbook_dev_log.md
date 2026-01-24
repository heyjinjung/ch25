# 2026-01-15 개발 로그 - OPS 플레이북 개선

## 작업 개요
- OPS 플레이북 실행기 확장 및 한글화/UX 개선.
- 타깃 리스트 기반 DM/토글 동작을 실제 실행 가능하게 정리.
- 결과 확인과 다중 액션 추가 등 운영 편의 기능 추가.

## 백엔드
- `app/services/ops_plan_service.py`
  - Golden Hour 토글/배수 설정을 실행 시 Vault2 설정에 즉시 반영하고 Ops Log 기록.
  - DM/메시지 템플릿 실행 시 타깃 리스트 멤버 상태를 `SENT`로 반영하고 로그 기록.
  - 기존 전수 지급(INVENTORY_GRANT_ALL) 실행 로직은 유지.
- 테스트 추가: `tests/test_admin_ops_plan_execution.py`
  - Golden Hour 실행 후 multiplier 반영 확인.
  - 메시지 템플릿 실행 시 타깃 멤버 상태가 SENT로 변경되는지 검증. (2/2 통과)

## 프런트엔드 (Admin OPS Playbook)
- 한글화 정비: 헤더/버튼/경고/툴팁/상태 라벨을 한국어로 통일, 타입/상태 라벨 매핑 추가.
- 다중 액션 추가: 체크박스 선택 후 일괄 추가 기능.
- 필터/검색: 상태·타입 필터와 제목/메모 검색 입력 추가.
- 실행 결과 표시: 발송 건수/배수/실행 시각/에러를 표로 표시하는 결과 칼럼 추가.
- 타깃 리스트 연동: DM payload에 타깃 리스트를 선택해 저장 가능.
- API/훅: OpsTargetList 타입 및 조회 훅(`useOpsTargetLists`) 추가로 UI에서 타깃 리스트 목록/카운트 사용.

## 테스트/이슈
- 백엔드 신규 테스트는 통과. (2026-01-15 19:15 추가 검증 완료)
  - `tests/test_ops_plan_actions.py`:
    - `InventoryService` 메서드 명칭 (`get_user_inventory` -> `get_inventory`) 및 속성 (`amount` -> `quantity`) 불일치 수정.
    - `GOLDEN_HOUR` 실행 결과 구조 (Nest removal) 수정.
    - Payload에 `kind` 필드 누락 수정.
    - **결과**: 총 8개 테스트 케이스 모두 통과 (Targeted Grant, Broadcast, Golden Hour, Grant All).
- `npm test -- --watch=false` 실행 시 로컬 환경에서 Vitest가 `spawn EPERM`으로 실패(환경 문제). 프런트 변경 후 별도 자동 테스트는 미실행 상태.

## 영향도/다음 단계
- 운영자가 실제 실행 결과와 대상 리스트를 UI에서 확인 가능해짐.
- 남은 과제: Vitest 환경 정리 후 프런트 테스트 실행, 결과 칼럼에 로그 링크 추가, 멀티 실행/일괄 상태 변경 UX 보강.
