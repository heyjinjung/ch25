문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
만능티켓 변환 정책(V2)을 DB로 저장하기 위한 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- 변환 대상 티켓 타입
- 변환 비율(1:1)
- 어드민 선택 즉시 반영

## 3. 테이블 정의 (Schema)
**Table**: `v2_ticket_conversion_policy`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 정책 식별자 |
| target_ticket_type | VARCHAR(50) | NOT NULL | 변환 대상 티켓 타입 (TicketType SoT) |
| ratio_numerator | INT | NOT NULL | 변환 비율 분자 (1) |
| ratio_denominator | INT | NOT NULL | 변환 비율 분모 (1) |
| is_active | TINYINT(1) | NOT NULL | 활성 여부 |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

## 4. 근거 (Source)
- 티켓 Enum SoT: [docs/v2_specs/01_core/v2_ticket_enum_sot_ko.md](../01_core/v2_ticket_enum_sot_ko.md#L1)
- 만능티켓 변환 SoT: [docs/v2_specs/01_core/v2_ticket_conversion_sot_ko.md](../01_core/v2_ticket_conversion_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
