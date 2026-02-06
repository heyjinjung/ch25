문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
레벨 보상표(V2)를 DB로 저장하기 위한 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- 레벨 1~20 보상표
- 레벨별 필요 XP 및 보상 정의

## 3. 테이블 정의 (Schema)
**Table**: `v2_level_reward_table`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| level | INT | PK | 레벨 번호 |
| required_xp | INT | NOT NULL | 해당 레벨 필요 XP |
| reward_type | VARCHAR(50) | NOT NULL | 보상 타입 (RewardType SoT) |
| reward_amount | INT | NOT NULL | 보상 수량 |
| reward_payload | JSON | NULL | 기프티콘 등 상세 payload |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

## 4. 근거 (Source)
- 레벨 보상표 SoT: [docs/v2_specs/01_core/v2_level_reward_table_sot_ko.md](../01_core/v2_level_reward_table_sot_ko.md#L1)
- 레벨포인트 확장 SoT: [docs/v2_specs/01_core/v2_level_point_extension_sot_ko.md](../01_core/v2_level_point_extension_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
