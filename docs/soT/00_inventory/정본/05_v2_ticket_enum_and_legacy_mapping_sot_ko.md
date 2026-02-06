문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

## 1. 목적 (Purpose)
V2 티켓 Enum 표준과 레거시 명칭 매핑 규칙을 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- 티켓 Enum 표준 목록
- 레거시 코드 Enum 매핑 규칙

## 3. 상위 SoT (References)
- 티켓 Enum: docs/SOT/inventory/변경로그/v2_ticket_enum_sot_ko.md
- 코드 정합: docs/SOT/inventory/변경로그/v2_ticket_enum_code_alignment_sot_ko.md
- 코드 SoT: app/v2/models/core/game_wallet.py

## 4. SoT: 티켓 Enum 표준
| 용어 | Enum | 저장소 | 설명 |
| :--- | :--- | :--- | :--- |
| 룰렛티켓 | ROULETTE_TICKET | user_game_wallet | 룰렛 참여 티켓 |
| 다이스티켓 | DICE_TICKET | user_game_wallet | 주사위 참여 티켓 |
| 골드키티켓 | GOLD_KEY_TICKET | user_game_wallet | 프리미엄 참여 티켓 |
| 다이아티켓 | DIAMOND_TICKET | user_game_wallet | 최상위 참여 티켓 |
| 복권티켓 | LOTTERY_TICKET | user_game_wallet | 복권 참여 티켓 |
| 체험티켓 | TRIAL_TICKET | user_game_wallet | 체험 룰렛 참여 티켓 |

## 5. SoT: 레거시 Enum 매핑
| 표준 Enum | 레거시 Enum | 상태 | 비고 |
| :--- | :--- | :--- | :--- |
| ROULETTE_TICKET | ROULETTE_COIN | 레거시 | 문서 표준으로 단일화 |
| DICE_TICKET | DICE_TOKEN | 레거시 | 문서 표준으로 단일화 |
| GOLD_KEY_TICKET | GOLD_KEY | 레거시 | 문서 표준으로 단일화 |
| DIAMOND_TICKET | DIAMOND_KEY | 레거시 | 문서 표준으로 단일화 |
| TRIAL_TICKET | TRIAL_TOKEN | 레거시 | 문서 표준으로 단일화 |
| LOTTERY_TICKET | LOTTERY_TICKET | 현행 | 동일 |

## 6. 운영 규칙
- 신규 문서/기획/설정에서는 표준 Enum만 사용한다.
- 레거시 Enum은 DB/로그 호환을 위해 코드 내부에서만 처리한다.

## 7. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 정본 생성(티켓 표준 및 레거시 매핑)
