문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 유저 세그먼트 저장 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- V2 유저별 세그먼트 결과 저장

## 3. 테이블 정의 (Schema)
**Table**: `v2_user_segment`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| user_id | INT | PK, FK→v2_user.id | 유저 식별자 |
| segment | VARCHAR(50) | NOT NULL | 세그먼트 키 |
| updated_at | DATETIME | NOT NULL | 갱신 시각 |

## 4. 인덱스 (Indexes)
- `ix_v2_user_segment_segment` (segment)

## 5. 근거 (Source)
- 세그먼트 정책 SoT: [docs/v2_specs/01_core/v2_user_segment_policy_sot_ko.md](../01_core/v2_user_segment_policy_sot_ko.md#L1)

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
