문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 User의 핵심 필드와 금고 SoT를 명확히 정의한다.

## 2. 범위 (Scope)
- V2 User 최소 필드 정의
- 금고 SoT 및 사용 제한

## 3. 용어 정의 (Definitions)
- **금고 SoT**: `user.vault_locked_balance`
- **Legacy 필드**: V1에 존재하나 V2에서는 신규 write 금지 필드

## 4. V2 User 최소 필드 (SoT)
| 필드 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 유저 식별자 |
| CC_id | VARCHAR(100) | UNIQUE, NOT NULL | 외부 식별자 (CC ID 등). 숫자 혼입 가능하므로 prefix 정책 필수 |
| nickname | VARCHAR(100) | INDEX, NULL | 운영자 최우선 식별자(검색/표시 SoT 1순위) |
| telegram_id | BIGINT | UNIQUE, NULL | 숫자 TG ID (검색은 tgid: 프리픽스 강제) |
| telegram_username | VARCHAR(100) | INDEX, NULL | @username (검색/표시 3순위) |
| created_at | DATETIME | NOT NULL | 생성 시각 (KST 기준) |
| updated_at | DATETIME | NOT NULL | 수정 시각 (KST 기준) |
| vault_locked_balance | INT | NOT NULL, default=0 | 금고 SoT(단일 원장) |

## 5. 정책 (Policy)
- V2 신규 로직은 **`vault_locked_balance`만** 금고 SoT로 사용한다.
- `vault_balance`, `vault_available_balance`, `cash_balance`는 **V2 신규 write 금지**.
- `created_at`, `updated_at`은 KST 기준으로 기록한다.

## 6. 운영/검증 (QA)
- [ ] 금고 SoT가 `vault_locked_balance`로만 처리되는지 확인
- [ ] Legacy 필드에 신규 write가 없는지 확인

## 7. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
