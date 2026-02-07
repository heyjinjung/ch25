문서 타입: DB 스키마
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 관리자 메시지 인박스 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- 유저별 메시지 수신/읽음 상태 저장

## 3. 테이블 정의 (Schema)
**Table**: `v2_admin_message_inbox`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 인박스 식별자 |
| user_id | INT | FK→v2_user.id | 유저 식별자 |
| message_id | INT | FK→v2_admin_message.id | 메시지 식별자 |
| is_read | BOOLEAN | NOT NULL | 읽음 여부 |
| read_at | DATETIME | NULL | 읽은 시각 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 인덱스 (Indexes)
- `ix_v2_admin_message_inbox_user_id` (user_id)
- `ix_v2_admin_message_inbox_message_id` (message_id)

## 5. 근거 (Source)
- 메시지 정책 SoT: [docs/SOT/00_deployment/아카이브/v2_admin_message_policy_sot_ko.md](../00_deployment/%EC%95%84%EC%B9%B4%EC%9D%B4%EB%B8%8C/v2_admin_message_policy_sot_ko.md#L1)

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
- v1.1 (2026-02-07, GitHub Copilot): SoT 경로 갱신
