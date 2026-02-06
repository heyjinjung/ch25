문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
문서 티켓 Enum과 코드 Enum의 불일치를 해소하고 단일 기준을 확정한다.

## 2. 범위 (Scope)
- 문서 표준 Enum ↔ 코드 Enum 매핑
- 레거시 Enum 명칭 처리 규칙

## 3. 용어 정의 (Definitions)
- 문서 Enum: V2 문서에서 사용하는 표준 티켓 Enum
- 코드 Enum: 백엔드 코드에 정의된 GameTokenType

## 4. SoT: 문서 Enum ↔ 코드 Enum 매핑표
| 문서 Enum (SoT) | 코드 Enum (GameTokenType) | 상태 | 비고 |
| :--- | :--- | :--- | :--- |
| ROULETTE_TICKET | ROULETTE_COIN | 레거시 | 문서 표준으로 단일화 |
| DICE_TICKET | DICE_TOKEN | 레거시 | 문서 표준으로 단일화 |
| GOLD_KEY_TICKET | GOLD_KEY | 레거시 | 문서 표준으로 단일화 |
| DIAMOND_TICKET | DIAMOND_KEY | 레거시 | 문서 표준으로 단일화 |
| LOTTERY_TICKET | LOTTERY_TICKET | 현행 | 동일 |
| TRIAL_TICKET | TRIAL_TOKEN | 레거시 | 문서 표준으로 단일화 |

## 5. 표준화 규칙
- 신규 문서/기획/스펙에서는 문서 Enum(ROULETTE_TICKET 등)만 사용한다.
- 코드 레거시 Enum은 유지하되, 문서/기획 표기에서 사용하지 않는다.
- 로그/리포트/대시보드에 문서 Enum을 우선 노출한다.

## 6. 운영/검증 (QA)
- [ ] 문서/기획 스펙에서 레거시 Enum 사용 금지
- [ ] 코드 상 매핑 테이블과 문서 Enum 일치 확인

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


## 7. 변경 이력
- v1.1 (2026-01-19, GitHub Copilot): TRIAL_TICKET 매핑 추가
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
