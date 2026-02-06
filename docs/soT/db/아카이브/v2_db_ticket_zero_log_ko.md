문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
Ticket Zero 지급 로그(V2)를 DB로 저장하기 위한 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- LUCKY SAVE 지급 기록
- 쿨다운(24시간) 검증 참고 로그

## 3. 테이블 정의 (Schema)
**Table**: `v2_ticket_zero_log`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 로그 식별자 |
| user_id | INT | NOT NULL | 유저 ID |
| ticket_type | VARCHAR(50) | NOT NULL | 지급 티켓 타입 |
| ticket_amount | INT | NOT NULL | 지급 수량 (기본 1) |
| reason | VARCHAR(80) | NOT NULL | 로그 사유(기본 BAILOUT_GRANT) |
| granted_at | DATETIME | NOT NULL | 지급 시각 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 근거 (Source)
- 티켓 제로 정책 SoT: [docs/v2_specs/02_game/v2_ticket_zero_policy_sot_ko.md](../02_game/v2_ticket_zero_policy_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
