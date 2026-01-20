문서 타입: 경제/상점 정책
버전: v1.1
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/운영 팀
상태: SoT

# V2 Shop & Exchange Policy SoT (상점 및 교환소)

## 1. 목적
유저가 보유한 재화(Vault, Token)를 소모하여 다른 가치(Ticket, Item, Key)로 교환하는 모든 경제 활동의 규칙을 정의한다.

## 2. 상점 (Shop)
금고(Vault) 잔액을 사용하여 게임 참여권(Ticket)이나 아이템을 구매하는 곳.

### 2.1. 상품 구조 (Product Structure)
`AdminShopConfig`에 의해 관리되는 동적 리스트.
| 필드 | 설명 | 예시 |
| :--- | :--- | :--- |
| `sku` | 고유 상품 코드 | `TICKET_ROULETTE_10` |
| `name` | 표시 이름 | 룰렛 티켓 10장 |
| `cost_type` | 지불 재화 | `VAULT` (User.vault_locked_balance) |
| `cost_amount` | 가격 | 10,000 |
| `reward_type` | 지급 재화/아이템 | `ROULETTE_TICKET` |
| `reward_amount` | 지급 수량 | 11 (10+1 보너스) |
| `daily_limit` | 일일 구매 제한 | 5 (회) |

### 2.2. 구매 프로세스
1.  **검증**: 유저 Vault 잔액(`vault_locked_balance`) >= 가격 확인.
2.  **결제**: Vault에서 `cost_amount` 차감 (즉시 차감, 트랜잭션 보장).
3.  **지급**: Wallet `ROULETTE_TICKET` 증가 (별도 Claim 없음).
4.  **기록**: `ShopOrder` 및 `VaulLog` 생성.

---

## 3. 교환소 (Exchange / Craft)
하위 재화(Fragment)를 상위 재화(Ticket)로 변환하거나, 티켓을 다른 티켓으로 교환하는 시스템.

### 3.1. 표준 명칭 준수
**본 문서의 모든 티켓/키 명칭은 [v2_ticket_enum_sot_ko.md](./v2_ticket_enum_sot_ko.md)를 따른다.**
- `GOLD_KEY` (Legacy) -> `GOLD_KEY_TICKET` (This Policy)
- `DIAMOND_KEY` (Legacy) -> `DIAMOND_TICKET` (This Policy)

### 3.2. 제작(Craft) 공식
| Input (재료) | Qty | Output (결과) | Qty | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `GOLD_KEY_FRAGMENT` | 10 | `GOLD_KEY_TICKET` | 1 | 100% 성공 |
| `DIAMOND_FRAGMENT` | 30 | `DIAMOND_TICKET` | 1 | (예정) |
| `ACORN` | 100 | `ROULETTE_TICKET` | 1 | (예시) 이벤트 교환 |

### 3.3. 교환 규칙
- **비가역성**: 상위 재화(`GOLD_KEY_TICKET`)를 하위 재화(`FRAGMENT`)로 분해(Breakdown)하는 기능은 제공하지 않는다.
- **수수료**: 교환 시 별도의 포인트 수수료는 부과하지 않는다 (Default).

---

## 4. 운영 정책
- **환불 불가**: 상점/교환소에서 구매/제작 완료된 아이템은 원칙적으로 환불이 불가능하다.
- **가격 변동**: 어드민을 통해 상품 가격/구성을 변경하더라도, 기존 구매 건에 소급 적용하지 않는다.

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


## 5. 변경 이력
- v1.1 (2026-01-19, Antigravity Agent): V2 Ticket Enum(`_TICKET`) 표준 명칭 적용.
- v1.0 (2026-01-19, Antigravity Agent): 상점/교환소 로직 SoT 및 상품 구조 정의.
