문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 관리자 메시지 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- 메시지 템플릿/히스토리 저장

## 3. 테이블 정의 (Schema)
**Table**: `v2_admin_message`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 메시지 식별자 |
| sender_admin_id | INT | NOT NULL | 발신 관리자 ID (0=시스템) |
| title | VARCHAR(255) | NOT NULL | 제목 |
| content | TEXT | NOT NULL | 내용 |
| is_deleted | BOOLEAN | NOT NULL | 삭제 플래그 |
| target_type | VARCHAR(50) | NOT NULL | 타게팅 타입 |
| target_value | VARCHAR(255) | NULL | 타게팅 값 |
| channels | JSON | NULL | 채널 목록 |
| recipient_count | INT | NOT NULL | 발송 대상 수 |
| read_count | INT | NOT NULL | 읽음 수 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 근거 (Source)
- 메시지 정책 SoT: [docs/v2_specs/05_ops/v2_admin_message_policy_sot_ko.md](../05_ops/v2_admin_message_policy_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
