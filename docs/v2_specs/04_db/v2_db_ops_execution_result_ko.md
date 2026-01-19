문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
Ops 실행 결과(V2)를 DB로 저장하기 위한 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- Ops Plan 실행 결과 저장
- 실행 결과 페이로드 JSON 기록

## 3. 테이블 정의 (Schema)
**Table**: `v2_ops_execution_result`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 결과 식별자 |
| task_id | INT | NOT NULL | ops_plan_task ID |
| kind | VARCHAR(50) | NOT NULL | 액션 종류 |
| payload_json | JSON | NOT NULL | 실행 결과 JSON |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 근거 (Source)
- Ops 실행 결과 스키마 SoT: [docs/v2_specs/05_ops/v2_ops_plan_execution_schema_sot_ko.md](../05_ops/v2_ops_plan_execution_schema_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
