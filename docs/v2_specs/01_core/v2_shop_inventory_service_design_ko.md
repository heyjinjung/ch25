문서 타입: 설계
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 상점/인벤토리 서비스 레이어의 인터페이스와 트랜잭션 원칙을 정의한다.

## 2. 범위 (Scope)
- ShopService 구매 플로우
- InventoryService 교환/지급 플로우
- 실패/롤백 케이스

## 3. 설계 원칙 (Principles)
- 금고 SoT는 `vault_locked_balance`만 사용한다.
- 구매는 **차감 → 로그 → 지급** 순서로 단일 트랜잭션에서 처리한다.
- 실패 시 모든 변경은 롤백된다.

## 4. 서비스 인터페이스 (Interfaces)
### 4.1 V2ShopService.purchase
- 입력: `user_id`, `sku`, `name`, `cost_amount`, `reward_type`, `reward_amount`
- 동작:
  1) 잔액 검증 (`vault_locked_balance >= cost_amount`)
  2) 금고 차감
  3) 주문 로그 기록 (`v2_shop_order`)
- 실패:
  - 잔액 부족 → 예외, 로그 생성 없음
  - 금액/수량 비정상 → 예외

### 4.2 V2InventoryService.log_exchange
- 입력: `user_id`, `input_type`, `input_amount`, `output_type`, `output_amount`
- 동작: 교환 로그 기록 (`v2_exchange_log`)
- 실패:
  - 수량 비정상 → 예외

## 5. TDD 케이스 목록 (TDD Cases)
- Shop 구매 성공: 잔액 차감 + 로그 생성
- Shop 구매 실패(잔액 부족): 차감 없음 + 로그 없음
- Exchange 로그 생성 성공
- Exchange 로그 실패(수량 비정상)

## 6. 근거 (Source)
- 상점/교환소 정책 SoT: [docs/v2_specs/01_core/v2_shop_exchange_policy_sot_ko.md](../01_core/v2_shop_exchange_policy_sot_ko.md#L1)
- 아이템/인벤토리 SoT: [docs/v2_specs/01_core/v2_item_inventory_sot_ko.md](../01_core/v2_item_inventory_sot_ko.md#L1)
- 금고 용어 SoT: [docs/v2_specs/01_core/v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md#L1)

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
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
