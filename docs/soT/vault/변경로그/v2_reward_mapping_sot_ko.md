문서 타입: SoT
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 보상 타입 ↔ 지급 경로 매핑을 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- reward_type과 지급 경로
- 번들 처리 기준
- **관련 문서**:
    - [금고 용어 SoT](v2_vault_glossary_sot_ko.md) (금고포인트 정의)
    - [강력한 금고 정책 SoT](v2_strict_vault_policy_sot_ko.md) (적립 제한 정책)
    - [RewardType 표준 SoT](v2_reward_type_standard_sot_ko.md)

## 3. 용어 정의 (Definitions)
- 지급 경로: 금고포인트/인벤토리

## 4. SoT: 보상 매핑표
| reward_type | 지급 경로(SoT) | 비고 |
| :--- | :--- | :--- |
| POINT | 금고포인트 user.vault_locked_balance | 기본 경로 ([Vault Glossary](v2_vault_glossary_sot_ko.md) 참조) |
| CC_POINT | 씨씨외부포인트 user.vault_locked_balance | 외부 포인트 |
| GAME_XP | 레벨포인트 level_point | 성장 포인트 |
| DIAMOND | 인벤토리 user_inventory_item | 다이아 |
| TICKET | 인벤토리 user_inventory_item | 만능티켓 |
| BUNDLE | 금고포인트 + 인벤토리 | 패키지 지급 |
| TICKET_BUNDLE | 인벤토리 user_inventory_item | 티켓 묶음 |
| NONE | 없음 | no-op |


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

## 5. 운영/검증 (QA)
- [ ] 매핑표 외 경로 금지
- [ ] 번들 지급 경로 일치 확인

## 6. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
