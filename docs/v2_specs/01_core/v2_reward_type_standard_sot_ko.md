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
- **CC 입금 용어 기준**: [docs/v2_specs/01_core/v2_cc_deposit_sot_ko.md](docs/v2_specs/01_core/v2_cc_deposit_sot_ko.md) SoT를 따른다.

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


## 5. 지급 경로 기준
- 지급 경로의 단일 기준은 보상 매핑표를 따른다.
- 보상 매핑표 외 경로로의 직접 지급은 금지한다.

## 6. 표준화 규칙
- 신규 보상 설계는 표준 RewardType 집합 내에서만 정의한다.
- 레거시 문자열(예: XP, VAULT 등)은 신규 정의에 사용하지 않는다.
- RewardType은 대소문자/스펠링을 고정한다.
- **어드민 라우터 모듈화 및 레거시 제거**: V2 Admin 라우터는 [app/v2/api/admin/](app/v2/api/admin/) 모듈로 분리하며, 레거시 [app/v2/api/admin_routes.py](app/v2/api/admin_routes.py)는 제거한다.

## 7. 운영/검증 (QA)
- [ ] reward_type 값이 표준 집합 내인지 검증
- [ ] 보상 매핑표와 지급 경로 일치 확인

## 8. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
- v1.1 (2026-01-20, GitHub Copilot): CC 입금 용어 SoT 링크 및 어드민 라우터 모듈화/레거시 제거 규칙 추가
