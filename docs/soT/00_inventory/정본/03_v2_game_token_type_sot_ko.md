문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

## 1. 목적 (Purpose)
V2 GameTokenType(지갑 토큰) 표준 목록과 사용 규칙을 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- GameTokenType 표준 목록
- 레거시 호환 토큰 처리 규칙
- 퍼즐 토큰/조각 규칙
- VAULT 가상 타입 규칙

## 3. 상위 SoT (References)
- 인벤토리/토큰 분류: docs/SOT/inventory/변경로그/v2_item_inventory_sot_ko.md
- 티켓 Enum: docs/SOT/inventory/변경로그/v2_ticket_enum_sot_ko.md
- 코드 SoT: app/v2/models/core/game_wallet.py

## 4. SoT: GameTokenType 표준 목록 (V2 Preferred)
모든 신규 기획/문서/구현은 아래 표준 명칭을 사용한다.

| 분류 | TokenType | 저장소 | 비고 |
| :--- | :--- | :--- | :--- |
| 티켓 | ROULETTE_TICKET | user_game_wallet | 룰렛 참여권 |
| 티켓 | DICE_TICKET | user_game_wallet | 다이스 참여권 |
| 티켓 | LOTTERY_TICKET | user_game_wallet | 복권 참여권 |
| 티켓 | GOLD_KEY_TICKET | user_game_wallet | 프리미엄 참여권 |
| 티켓 | DIAMOND_TICKET | user_game_wallet | 최상위 참여권 |
| 티켓 | TRIAL_TICKET | user_game_wallet | 체험 티켓 |
| 조각 | GOLD_KEY_FRAGMENT | user_game_wallet | 10개 -> GOLD_KEY_TICKET |
| 조각 | DIAMOND_FRAGMENT | user_game_wallet | 30개 -> DIAMOND_TICKET |
| 퍼즐 | PUZZLE_C1 | user_game_wallet | 퍼즐 조각 |
| 퍼즐 | PUZZLE_C2 | user_game_wallet | 퍼즐 조각 |
| 퍼즐 | PUZZLE_J | user_game_wallet | 퍼즐 조각 |
| 퍼즐 | PUZZLE_M | user_game_wallet | 퍼즐 조각 |
| 재화 | DIAMOND | user_game_wallet | 상점/보상 재화 |

## 5. 레거시 호환 토큰 (사용 제한)
아래 값은 기존 DB/로그 호환을 위해서만 유지된다.
신규 문서/기획/설정에서는 사용 금지.

| 레거시 | 표준 | 비고 |
| :--- | :--- | :--- |
| ROULETTE_COIN | ROULETTE_TICKET | 레거시 V1 |
| DICE_TOKEN | DICE_TICKET | 레거시 V1 |
| GOLD_KEY | GOLD_KEY_TICKET | 레거시 V1 |
| DIAMOND_KEY | DIAMOND_TICKET | 레거시 V1 |
| DIAMOND_KEY_FRAGMENT | DIAMOND_FRAGMENT | 레거시 V1 |
| TRIAL_TOKEN | TRIAL_TICKET | 레거시 V1 |

## 6. 퍼즐 토큰 규칙
- PUZZLE_C는 폐기(Deprecated)이며, 신규 사용 금지.
- 신규 지급/교환은 PUZZLE_C1 또는 PUZZLE_C2를 사용한다.

## 7. VAULT 가상 타입 규칙
- VAULT는 지갑 토큰이 아니다.
- 실제 SoT는 user.vault_locked_balance이며, VAULT는 상점/설정에서 금고를 지칭하는 가상 타입이다.

## 8. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 정본 생성(GameTokenType 표준/레거시/퍼즐/VAULT 규칙)
