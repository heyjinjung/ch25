문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 세그먼트 규칙 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- V2 세그먼트 규칙 저장

## 3. 테이블 정의 (Schema)
**Table**: `v2_segment_rule`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 규칙 식별자 |
| name | VARCHAR(120) | UNIQUE, NOT NULL | 규칙 이름 |
| segment | VARCHAR(50) | NOT NULL | 결과 세그먼트 키 |
| priority | INT | NOT NULL | 우선순위(낮을수록 우선) |
| enabled | BOOLEAN | NOT NULL | 사용 여부 |
| condition_json | JSON | NOT NULL | 조건 DSL |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

## 4. 근거 (Source)
- 세그먼트 정책 SoT: [docs/v2_specs/01_core/v2_user_segment_policy_sot_ko.md](../01_core/v2_user_segment_policy_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
