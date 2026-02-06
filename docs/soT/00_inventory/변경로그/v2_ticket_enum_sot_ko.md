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
| 체험티켓 | TRIAL_TICKET | user_game_wallet | 체험 룰렛 참여 티켓 |

## 5. 운영/검증 (QA)
- [ ] Enum/용어/SoT 일치 여부 확인
- [ ] 레거시 명칭 사용 금지 확인

SoT 기준 표준 보상 아이템 (10개 카테고리)
1. 게임 티켓 (Game Wallet - Fungible Tokens)
Value	Label	저장소
ROULETTE_TICKET	룰렛 티켓 (금파)	
UserGameWallet
DICE_TICKET	다이스 티켓 (Dice)	
UserGameWallet
LOTTERY_TICKET	복권 티켓 (그리기)	
UserGameWallet
근거: 
v2_item_inventory_sot_ko.md
 3.1절

2. 금고 (Virtual Token for Buy-In)
Value	Label	저장소
VAULT	금고 포인트 (P)	User.vault_locked_balance
근거: 
v2_item_inventory_sot_ko.md
 2절 주석

3. 프리미엄 티켓 & 조각 (Game Wallet)
Value	Label	저장소
GOLD_KEY_TICKET	골드 열쇠 티켓 (S급)	
UserGameWallet
DIAMOND_TICKET	다이아몬드 티켓 (SS급)	
UserGameWallet
GOLD_KEY_FRAGMENT	골드 열쇠 조각 (x10)	
UserGameWallet
DIAMOND_FRAGMENT	다이아몬드 조각 (x30)	
UserGameWallet
근거: 
v2_item_inventory_sot_ko.md
 3.1절

4. 복권 퍼즐 조각 (Game Wallet)
Value	Label	저장소
PUZZLE_C1	퍼즐 조각 C1 (당첨)	
UserGameWallet
PUZZLE_C2	퍼즐 조각 C2 (당첨)	
UserGameWallet
PUZZLE_J	퍼즐 조각 J (당첨)	
UserGameWallet
PUZZLE_M	퍼즐 조각 M (당첨)	
UserGameWallet
근거: 
v2_item_inventory_sot_ko.md
 3.1절

5. 재화 (Game Wallet - Currency)
Value	Label	저장소
DIAMOND	다이아몬드 (재화)	
UserGameWallet
근거: 
v2_item_inventory_sot_ko.md
 3.1절

6. 기프티콘 (Inventory - Non-Fungible Items)
Value	Label	저장소
CHICKEN_GIFTICON_5000	치킨 기프티콘 5천원	
UserInventoryItem
CHICKEN_GIFTICON_10000	치킨 기프티콘 1만원	
UserInventoryItem
STARBUCKS_GIFTICON_2000	스타벅스 기프티콘 2천원	
UserInventoryItem
STARBUCKS_GIFTICON_10000	스타벅스 기프티콘 1만원	
UserInventoryItem
PIZZA_GIFTICON_5000	피자 기프티콘 5천원	
UserInventoryItem
PIZZA_GIFTICON_10000	피자 기프티콘 1만원	
UserInventoryItem
GOOGLE_GIFTICON_5000	구글 기프티콘 5천원	
UserInventoryItem
GOOGLE_GIFTICON_10000	구글 기프티콘 1만원	
UserInventoryItem
근거: 
v2 _gifticon_naming_sot_ko.md
 5절

7. 특수 (No-Op)
Value	Label	저장소
NONE	없음 (보상 없음)	N/A
근거: 
v2_reward_type_standard_sot_ko.md
 4절

20260120


## 6. 변경 이력
- v1.1 (2026-01-19, GitHub Copilot): TRIAL_TICKET 추가
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
