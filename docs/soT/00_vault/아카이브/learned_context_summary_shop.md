# Shop Domain Learned Context Summary
> **Updated**: 2026-01-26
> **Source**: `docs/v2_specs/01_core/v2_shop_*`, `docs/v2_specs/03_api/v2_inventory_shop_*`

## 1. Domain Purpose & Scope
- **Shop**: Uses **Vault** balance (`vault_locked_balance`) to purchase **Game Tickets** or **Items**.
- **Exchange (Craft)**: Converts lower-tier resources (Fragments) to higher-tier (Tickets). **Irreversible** (No breakdown).
- **Inventory**: Stores non-fungible or stackable consumption items (Gifticons). Distinct from Game Wallet (Tokens).

## 2. Core Policies & Rules
### 2.1 Asset Classification (Strict Separation)
| Category | Storage | DB Field | Characteristic | Examples |
| :--- | :--- | :--- | :--- | :--- |
| **Cash** | `Vault` | `user.vault_locked_balance` | Real value, Withdraw-able | `VAULT` (Virtual Token) |
| **Token** | `GameWallet` | `user_game_wallet.balance` | Game currency, Fungible | `ROULETTE_TICKET`, `DIAMOND` |
| **Item** | `Inventory` | `user_inventory_item.quantity` | Consumable, Non-fungible | `STARBUCKS_GIFTICON_5000` |

### 2.2 Product & Purchase Logic
- **SKU Based**: All shop products are defined by `sku` (e.g., `TICKET_ROULETTE_10`).
- **Transaction Flow**:
  1. **Verify**: `vault_locked_balance` >= `cost_amount`.
  2. **Deduct**: Immediate deduction from Vault.
  3. **Log**: Create `v2_shop_order` and `vault_earn_event` (transactional).
  4. **Grant**: Add items to Game Wallet or Inventory immediately (No manual claim).
- **Refund Policy**: No refunds allowed. Price changes are not retroactive.

### 2.3 Naming Standards (SoT)
- **Tickets**: Must strictly follow `*_TICKET` suffix (e.g., `ROULETTE_TICKET`). Legacy terms like `_COIN`, `_TOKEN` are deprecated.
- **Gifticons**: Must follow `{BRAND}_GIFTICON_{AMOUNT}` (e.g., `CHICKEN_GIFTICON_10000`).

## 3. Operational & Technical Context
### 3.1 DB Schema & APIs
- **DB Tables**:
  - `v2_shop_products`: Admin-managed product list.
  - `v2_shop_order`: Purchase history log.
  - `v2_exchange_log`: Craft/Exchange history.
  - `user_inventory_item`: User's item storage.
- **Key APIs**:
  - `POST /api/v2/shop/purchase`: Buy products.
  - `GET /api/v2/shop/products`: List available products.
  - `POST /api/v2/inventory/use`: Use/Consume an item.

### 3.2 Known Risks & Checkpoints
- **Strict Vault Policy**: Purchases must be blocked if user is `benefits_suspended` (7-day no-deposit rule). **This is a critical implementation checkpoint.**
- **Empty Shop**: If `v2_shop_products` is empty or misconfigured, the shop page will show nothing.
- **Naming Mismatch**: Legacy code may still use `_COIN` or `_TOKEN`. Strict mapping to `_TICKET` Enum is required.

## 4. 2nd Pass Learning (Detailing)
### 4.1 Strict Vault Policy (Payment Rules)
> Source: `v2_strict_vault_policy_sot_ko.md`
- **Withdrawal Eligibility**:
  - **Net Increase**: `cc_deposit` must show net increase vs previous day.
  - **Spending**: `vault_spent_today` >= 10,000 KRW.
- **Benefit Suspension**:
  - **INACTIVE**: >7 days since last deposit -> **Shop/Game blocked**.
  - **Enforcement**: Must be blocked at **Service Layer** (returns 403), not just UI.
- **Balance SoT**: `User.vault_locked_balance` is the **ONLY** truth. `vault_available_balance` is unused/zero.

### 4.2 Naming Standards (Gifticon)
> Source: `v2_gifticon_naming_sot_ko.md`
- **Format**: `{BRAND}_GIFTICON_{AMOUNT}`
- **Allowed Brands**: `CHICKEN`, `STARBUCKS`, `PIZZA`, `GOOGLE` (Strict whitelist).
- **Amount**: Integer (KRW), 100-won truncate recommended.
- **New Brand Process**: Must be registered in SoT document before DB insertion.

### 4.3 Reward Types & Mapping
> Source: `v2_reward_type_standard_sot_ko.md`, `v2_reward_mapping_sot_ko.md`
- **Standard Types**:
  - `POINT` -> Vault (`user.vault_locked_balance`)
  - `GAME_XP` -> Level Point (`level_point`?)
  - `DIAMOND` -> Inventory/Wallet
  - `TICKET` -> Inventory (Generic Voucher?) vs `ROULETTE_TICKET` -> GameWallet (Token)
  - `BUNDLE` -> Composite (Vault + Inventory)
- **Nuance**: Specific Game Tickets (`ROULETTE_TICKET`, etc.) go to `UserGameWallet` (Fungible), while generic `TICKET` type or Gifticons go to `UserInventoryItem` (Non-fungible/Stackable). Use `RewardService` to dispatch correctly.

## 5. 3rd Pass Learning (DB & Ops)
### 5.1 DB Schema Details
> Source: `v2_db_shop_order_ko.md`, `v2_db_exchange_log_ko.md`
- **Shop Order (`v2_shop_order`)**:
  - `user_id`, `sku`, `name`, `cost_type` (VAULT), `cost_amount`, `reward_type`, `reward_amount`.
  - Purely for logging/audit. Transactions are handled by `ShopService` (deduct Vault -> insert Log -> grant Reward).
- **Exchange Log (`v2_exchange_log`)**:
  - `input_type`/`amount` -> `output_type`/`amount`.
  - Tracks irreversible craft usage (e.g., Fragments -> Ticket).

### 5.2 UI Config Strategy (`v2_shop_products`)
> Source: `v2_shop_products_ui_config_sot_ko.md`
- **Storage**: JSON config (Admin-managed), not a DB table.
- **Structure**: Array of product objects.
  - Required: `product_id`, `title`, `reward_type`, `reward_amount`, `cost_type` (VAULT), `cost_amount`, `visible`, `sort_order`.
  - Optional: `badge`, `stock_limit`, `purchase_limit_per_user`, `start/ends_at`.
- **Hard Rule**: If config is **empty or missing**, the Shop API returns an **empty list** (Safe fail).
- **Validation**: `cost_amount` & `reward_amount` must be integers >= 1. `visible=false` items are filtered out.

## 6. Change History & Status
- **2026-01-26 (3rd Pass)**: Added DB Schema (`v2_shop_order`, `v2_exchange_log`) and Ops Config (`v2_shop_products`).
- **2026-01-26 (2nd Pass)**: Added details on Strict Vault Policy, Naming Standards, and Reward Mapping.
- **2026-01-26 (1st Pass)**: Context learned and summarized.
- **Latest SoT Version**: v1.1 ~ v2.0 (Jan 2026).
- **Status**: V2 Migration Active. Wallet/Inventory separation is the key architecture change.
