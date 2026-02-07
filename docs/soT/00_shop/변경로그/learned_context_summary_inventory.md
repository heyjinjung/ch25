# Learned Context Summary: Inventory Domain (Final Integrated)

## 1. 개요 (Overview)
이 문서는 인벤토리(Inventory) 및 아이템(Item) 도메인과 관련된 SoT 문서, API 계약, 서비스 설계, 운영 정책(상점/교환/금고정책)을 통합 요약한 문서입니다.
**키워드**: Inventory, Item, Gifticon, Shop, Exchange, Vault Policy

## 2. 도메인별 핵심 정책 및 아키텍처

### 2.1 Asset Classification (자산 분류)
- **3대 자산 분류**:
    - **Cash (Vault)**: `User.vault_locked_balance`. 유저 출금 가능 자산.
    - **Token (Game Wallet)**: `UserGameWallet`. 게임 내 재화 (티켓, 다이아 등). 대체 가능(Fungible).
    - **Item (Inventory)**: `UserInventoryItem`. 소비성 아이템 (기프티콘 등). 비대체성/스택형.

- **표준 ItemType (기프티콘)**:
    - 포맷: `{BRAND}_GIFTICON_{AMOUNT}` (예: `STARBUCKS_GIFTICON_5000`) (SoT 준수 필수).
    - 브랜드 목록: CHICKEN, STARBUCKS, PIZZA, GOOGLE (API 문서 내 목록과 DB 일치 필수).

### 2.2 Service Architecture (서비스 아키텍처)
- **V2InventoryService**:
    - 역할: 아이템 조회, 사용(Use), 교환(Exchange) 처리.
    - 주요 로직: `require_and_consume` (atomic 차감), `log_exchange`.
    - API: `GET /api/v2/inventory`, `POST /api/v2/inventory/use`.

- **V2ShopService**:
    - 역할: 상점 상품 구매 처리.
    - 주요 로직: `purchase` (잔액 검증 -> 차감 -> 로그 -> 보상 지급). Transaction 보장.
    - API: `GET /api/v2/shop/products`, `POST /api/v2/shop/purchase`.

- **Reward System Integration**:
    - **Game Wallet** vs **Inventory** 분기 로직이 핵심.
    - `RewardService.deliver`: `TICKET`/`DIAMOND` -> Wallet, `GIFTICON` -> Inventory 로 자동 라우팅.
    - 매핑표(`v2_reward_mapping_sot_ko.md`)에 정의되지 않은 경로는 지급 금지.

### 2.3 Policy & Operations (정책 및 운영)
- **Exchange (교환소)**:
    - **비가역성**: 상위 재화 -> 하위 재화 분해(Breakdown) 기능 미제공.
    - **수수료**: 교환 시 별도 수수료 없음 (Default).
- **Strict Vault Policy (강력한 금고 정책)**:
    - **혜택 중단**: 7일 이상 무입금 시 `benefits_suspended=True` -> 상점/게임 이용 차단.
    - **금고 한도**: INACTIVE 유저는 30,000 KRW 한도 적용.
    - **SSoT**: `vault_locked_balance`만 유효. (`available` 미사용).

### 2.4 Data Structure (Schema)
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| `UserInventoryItem` | 유저 보유 아이템 | `user_id`, `item_type`, `quantity` |
| `v2_shop_order` | 상점 구매 로그 | `user_id`, `sku`, `cost_amount`, `reward_type`, `reward_amount` |
| `v2_exchange_log` | 교환/제작 로그 | `user_id`, `input_type`/`amount`, `output_type`/`amount` |
| `v2_ticket_conversion_policy` | 변환 정책 | `target_ticket_type`, `ratio_numerator`/`denominator`(1:1) |
| `GameTokenType` | 게임 재화 Enum | `ROULETTE_TICKET`, `DICE_TICKET` 등 (Legacy `_COIN` 매핑 주의) |

### 2.5 UI/Ops Configuration
- **Shop UI Config (`v2_shop_products`)**:
    - **저장소**: UI Config (운영 설정)
    - **구조**: `[{ product_id, title, reward_type, reward_amount, cost_type, cost_amount, visible, ... }]`
    - **주의**: 키가 없거나 비어있으면 상점 목록이 **Empty Array**로 반환됨. 운영 시 필수 설정.
- **Frontend Pages**:
    - `/v2/inventory`, `/v2/shop` 라우트 존재. 현재 Redesign 진행 중(🚧).

## 3. 주요 정합성 점검 포인트 (Alignment Checklist)

| 영역 | 점검 항목 | 기준 (SoT) | 리스크 / 확인 필요 |
| :--- | :--- | :--- | :--- |
| **Data** | **자산 저장소 분리** | Cash/Token/Item 구분 | `GameWallet`에 기프티콘 적재하거나 반대 경우 탐지 |
| **Logic** | **상점 트랜잭션** | 차감->로그->지급 (Atomic) | 중간 실패 시 잔액만 차감되고 보상 미지급되는지 확인 |
| **Policy** | **강력한 금고 정책** | 7일 무입금 차단 | `ShopService`/`GameService`에 차단 로직 구현 여부 |
| **Config** | **상점 목록 노출** | `v2_shop_products` 존재 | 설정 누락 시 빈 화면(배열) 노출 리스크 |
| **Enum** | **기프티콘 네이밍** | `{BRAND}_GIFTICON_{AMOUNT}` | 오타, 포맷 위반(예: 소문자, 단위 누락) |
| **Ops** | **브랜드 확장** | 문서 등재 후 DB Insert | 문서 업데이트 없이 운영팀이 임의 추가하는 경우 |

## 4. 트러블슈팅/운영 이력
- **V1 의존성**: `app/models/inventory.py` 등 공용 모델 사용 중. 향후 V2 전용 스키마로 분리 필요.
- **Reward Type**: `BUNDLE` 처리 로직 및 교환소 `GOLD_KEY_TICKET` 등 명칭 매핑 주의.

## 5. 결론
인벤토리 도메인은 **자산의 성격에 따른 저장소 분리**와 **강력한 금고 정책(무입금 차단)** 준수가 핵심입니다. 특히 `User.vault_locked_balance`가 0원일 때 혹은 차단 상태일 때 상점 이용이 불가하도록 서비스 레이어에서 방어 로직이 동작해야 합니다.
