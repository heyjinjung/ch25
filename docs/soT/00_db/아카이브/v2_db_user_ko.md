문서 타입: DB 스키마
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

[최종 검토일: 2026-01-26]
[정책 최신화 필요 여부: 🟢] 🟢 [정합] `vault_locked_balance`(INT, NOT NULL) SoT가 01_core 정책과 일치.

## 1. 목적 (Purpose)
V2 User 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- V2 User 최소 필드 및 금고 SoT

## 3. 테이블 정의 (Schema)
**Table**: `v2_user`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 유저 식별자 |
| cc_id | VARCHAR(100) | UNIQUE, NOT NULL | 외부 식별자 (CC ID 등) |
| nickname | VARCHAR(100) | INDEX, NULL | 운영자 최우선 식별자 |
| telegram_id | BIGINT | UNIQUE, NULL | 숫자 TG ID |
| telegram_username | VARCHAR(100) | INDEX, NULL | @username |
| vault_locked_balance | INT | NOT NULL | 금고 SoT |
| created_at | DATETIME | NOT NULL | 생성 시각 (KST 기준) |
| updated_at | DATETIME | NOT NULL | 수정 시각 (KST 기준) |

## 4. 근거 (Source)
- V2 User SoT: [docs/SOT/user/v2_user_sot_ko.md](../user/v2_user_sot_ko.md#L1)
- 금고 용어 SoT: [docs/SOT/vault/v2_vault_glossary_sot_ko.md](../vault/v2_vault_glossary_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
- v1.1 (2026-02-07, GitHub Copilot): SoT 경로 갱신
