문서 타입: 핵심 로직/정책
버전: v1.2
작성일: 2026-01-19
작성자: Antigravity Agent
대상: BE/FE/기획
상태: SoT

# V2 Item & Inventory SoT (아이템 및 인벤토리)

## 1. 목적
유저가 보유한 모든 자산 중 **금고(Vault)**를 제외한 게임 재화(Wallet)와 아이템(Inventory)의 분류 기준, 저장 방식, 사용 로직을 정의한다.

## 2. 자산 분류 (Asset Classification)
V2 시스템은 자산을 성격에 따라 3가지 카테고리로 엄격히 구분한다. 실제 DB 스키마와 1:1 매핑된다.

| 구분 | 저장소 (Storage) | DB Table.Field | 특징 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| **Cash** | `Vault` | `User.vault_locked_balance` | 현금성 자산, 출금 가능, 유효기간 존재 | (구) `KRW_POINT` |
| **Token** | `GameWallet` | `UserGameWallet.balance` | 게임 내 재화, 대체 가능(Fungible) | `ROULETTE_TICKET`, `DICE_TICKET` |
| **Item** | `Inventory` | `UserInventoryItem.quantity` | 소비성 아이템, 보관함 (비대체성 또는 스택형) | `VOUCHER_*`, `RANDOM_BOX` |

> **Note**: `VAULT` (Virtual Token)는 상점 등에서 `User.vault_locked_balance`를 지칭하기 위한 가상의 토큰 타입이다.

---

## 3. Game Token (Wallet)
게임 플레이 및 교환소의 기초 통화. `GameTokenType` Enum으로 관리된다.  
**주의**: V1 코드(`game_wallet.py`)의 레거시 명칭(`_COIN`, `_TOKEN` 등)은 V2에서 아래 표준으로 마이그레이션되어야 한다.

### 3.1. 표준 토큰 목록 (V2 Standard)
**근거 문서**: [v2_ticket_enum_sot_ko.md](./v2_ticket_enum_sot_ko.md)

- `ROULETTE_TICKET`: 룰렛 참여권 (V1: `ROULETTE_COIN`)
- `DICE_TICKET`: 다이스 참여권 (V1: `DICE_TOKEN`)
- `LOTTERY_TICKET`: 복권 참여권
- `GOLD_KEY_TICKET`: S급 상품 교환권 (V1: `GOLD_KEY`)
- `DIAMOND_TICKET`: 최상위 희귀 재화 (V1: `DIAMOND_KEY`)
- `GOLD_KEY_FRAGMENT`: 10개 -> 1 Gold Key Ticket
- `DIAMOND_FRAGMENT`: 30개 -> 1 Diamond Ticket
- `PUZZLE_*`: 복권 당첨용 퍼즐 조각 (C1, C2, J, M)
- `DIAMOND`: (재화) 미션 리워드 등으로 획득, 주로 상점 재화로 사용
    - 표준 조각: `PUZZLE_C1`, `PUZZLE_C2`, `PUZZLE_J`, `PUZZLE_M`

---

## 4. Item (Inventory)
유저가 획득하여 "사용(Use)"하거나 "개봉(Open)"하는 객체.

### 4.1. 아이템 타입 (ItemType)
`UserInventoryItem` 테이블에 저장되는 문자열 키.
| ItemType | 설명 | 효과/로직 |
| :--- | :--- | :--- |
| `VOUCHER_STARBUCKS` | 교환권 | 오프라인 기프티콘 사용을 위한 바코드 노출 |
| `RANDOM_BOX_A` | 랜덤박스 | 사용 시 확률에 따라 Token/Point 획득 |
| `STREAK_FREEZER` | 기능성 | 스트릭 초기화 방어 (자동/수동 사용) |
| `STARTER_PACK` | 번들 | 사용 시 다수의 Ticket/Point가 Wallet으로 지급 |

### 4.2. 사용 로직 (Usage Logic)
1.  **Client**: `POST /api/inventory/use` `{item_type, quantity}`
2.  **Server**:
    - `UserInventoryItem` 수량 차감 (Atomic Decrement).
    - 아이템 효과 실행 (Service Layer).
    - 결과 반환 (획득한 재화 등).

---

## 5. 데이터 구조 (Schema)
### 5.1. UserInventoryItem
```sql
TABLE user_inventory_item (
    user_id INT,
    item_type VARCHAR(50), -- Enum String
    quantity INT DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE(user_id, item_type)
)
```

## 6. 변경 이력
- v1.3 (2026-01-20, Antigravity Agent): UI 라벨 표준화 (괄호 설명 제거) 및 문서 정리.
- v1.2 (2026-01-19, Antigravity Agent): V2 Ticket Enum SoT 기준으로 토큰 명칭 정정 (`_TICKET` suffix 통일).
- v1.1 (2026-01-19, Antigravity Agent): 실제 DB 필드명(`vault_locked_balance`, `UserGameWallet`)과 매핑 보정.
- v1.0 (2026-01-19, Antigravity Agent): Wallet/Inventory 분리 원칙 확립.
