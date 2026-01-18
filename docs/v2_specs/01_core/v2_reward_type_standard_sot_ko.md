문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 RewardType의 표준 집합과 처리 규칙을 확정한다.

## 2. 범위 (Scope)
- reward_type 표준 집합
- 표준 reward_type의 지급 경로 기준
- 레거시/확장 처리 원칙

## 3. 용어 정의 (Definitions)
- reward_type: 게임/이벤트/프로모션 결과로 발생하는 보상 타입 코드

## 4. SoT: RewardType 표준 집합
| reward_type | 설명 |
| :--- | :--- |
| POINT | 금고포인트 지급 |
| CC_POINT | 외부 포인트 계열(금고포인트로 적립) |
| GAME_XP | 레벨포인트 지급 |
| DIAMOND | 인벤토리 다이아 지급 |
| TICKET | 만능티켓 지급 |
| BUNDLE | 복합 지급(금고포인트 + 인벤토리) |
| TICKET_BUNDLE | 티켓 묶음 지급 |
| NONE | 무지급(no-op) |

## 5. 지급 경로 기준
- 지급 경로의 단일 기준은 보상 매핑표를 따른다.
- 보상 매핑표 외 경로로의 직접 지급은 금지한다.

## 6. 표준화 규칙
- 신규 보상 설계는 표준 RewardType 집합 내에서만 정의한다.
- 레거시 문자열(예: XP, VAULT 등)은 신규 정의에 사용하지 않는다.
- RewardType은 대소문자/스펠링을 고정한다.

## 7. 운영/검증 (QA)
- [ ] reward_type 값이 표준 집합 내인지 검증
- [ ] 보상 매핑표와 지급 경로 일치 확인

## 8. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
