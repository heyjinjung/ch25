문서 타입: SoT
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 티켓 Enum의 단일 기준을 확정한다.

## 2. 범위 (Scope)
- 게임 티켓 명칭/Enum/지급 경로

## 관련 문서
- v2_ticket_enum_code_alignment_sot_ko.md

## 3. 용어 정의 (Definitions)
- 티켓 Enum: 게임 참여권을 나타내는 표준 코드

## 4. SoT: 티켓 Enum 표
| 용어 | Enum | SoT | 설명 |
| :--- | :--- | :--- | :--- |
| 룰렛티켓 | ROULETTE_TICKET | user_game_wallet | 룰렛 참여 티켓 |
| 다이스티켓 | DICE_TICKET | user_game_wallet | 주사위 참여 티켓 |
| 골드키티켓 | GOLD_KEY_TICKET | user_game_wallet | 프리미엄 참여 티켓 |
| 다이아티켓 | DIAMOND_TICKET | user_game_wallet | 최상위 등급 참여 티켓 |
| 복권티켓 | LOTTERY_TICKET | user_game_wallet | 복권 참여 티켓 |

## 5. 운영/검증 (QA)
- [ ] Enum/용어/SoT 일치 여부 확인
- [ ] 레거시 명칭 사용 금지 확인

## 6. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
