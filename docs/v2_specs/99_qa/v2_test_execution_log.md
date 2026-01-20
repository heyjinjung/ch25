# V2 Test Execution Log

## 2026-01-20 (Core User & Level System)

### Summary
- **Execution Time**: 2026-01-20 19:47 KST
- **Scope**: Core User Model, Game Token Standard, Level System Logic (Deposit-Only)
- **Status**: ✅ All Passed
- **Executor**: Antigravity Agent

### Test Suites Details

#### 1. Core User Model (`tests/v2_tests/core/test_user_core.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_create_user_sot_compliance` | ✅ Passed | Verifies User schema against SoT (Fields, Defaults, Constraints). |
| `test_user_external_id_unique` | ✅ Passed | Verifies `external_id` uniqueness constraint. |
| `test_user_game_wallet_relationship` | ✅ Passed | Verifies relationship with `UserGameWallet` using V2 Enum. |

#### 2. Game Token Standard (`tests/v2_tests/test_game_token_standard.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_v2_standard_values` | ✅ Passed | Verifies V2 Standard Token basic values (ROULETTE_TICKET, etc.). |
| `test_v1_legacy_compatibility` | ✅ Passed | Verifies V1 Legacy Aliases exist for backward compatibility. |
| `test_sot_compliance` | ✅ Passed | Verifies Enum contains all standard tokens defined in SoT. |

#### 3. Level System Logic (`tests/v2_tests/core/test_level_system.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_level_xp_deposit_only_strictness` | ✅ Passed | **Critical**: XP can ONLY be acquired via `CC_DEPOSIT` (case-insensitive). Other sources rejected. |
| `test_grant_xp_for_deposit_logic` | ✅ Passed | Verifies math: 100,000 KRW = 20 XP. |
| `test_level_up_and_reward_delivery` | ✅ Passed | Verifies Level 1->2 transition and Reward (DICE_TICKET) delivery mapping. |

### Key Findings & Actions
- **Level XP Service Refactored**: Updated `app/services/level_xp_service.py` to strictly check `source` and match `v2_level_reward_table_sot_ko.md`.
- **Ticket Mapping**: V2 Ticket Enums (`_TICKET`) are correctly mapped in the reward delivery logic.
- **Testing Strategy**: Adopted Mock-based Unit Testing for Logic Verification to ensure reliability without DB session overhead.


# V2 Test Execution Log

## 2026-01-20 (Core User & Level System)

### Summary
- **Execution Time**: 2026-01-20 19:47 KST
- **Scope**: Core User Model, Game Token Standard, Level System Logic (Deposit-Only)
- **Status**: ✅ All Passed
- **Executor**: Antigravity Agent

### Test Suites Details

#### 1. Core User Model (`tests/v2_tests/core/test_user_core.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_create_user_sot_compliance` | ✅ Passed | Verifies User schema against SoT (Fields, Defaults, Constraints). |
| `test_user_external_id_unique` | ✅ Passed | Verifies `external_id` uniqueness constraint. |
| `test_user_game_wallet_relationship` | ✅ Passed | Verifies relationship with `UserGameWallet` using V2 Enum. |

#### 2. Game Token Standard (`tests/v2_tests/test_game_token_standard.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_v2_standard_values` | ✅ Passed | Verifies V2 Standard Token basic values (ROULETTE_TICKET, etc.). |
| `test_v1_legacy_compatibility` | ✅ Passed | Verifies V1 Legacy Aliases exist for backward compatibility. |
| `test_sot_compliance` | ✅ Passed | Verifies Enum contains all standard tokens defined in SoT. |

#### 3. Level System Logic (`tests/v2_tests/core/test_level_system.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_level_xp_deposit_only_strictness` | ✅ Passed | **Critical**: XP can ONLY be acquired via `CC_DEPOSIT` (case-insensitive). Other sources rejected. |
| `test_grant_xp_for_deposit_logic` | ✅ Passed | Verifies math: 100,000 KRW = 20 XP. |
| `test_level_up_and_reward_delivery` | ✅ Passed | Verifies Level 1->2 transition and Reward (DICE_TICKET) delivery mapping. |

### Key Findings & Actions
- **Level XP Service Refactored**: Updated `app/services/level_xp_service.py` to strictly check `source` and match `v2_level_reward_table_sot_ko.md`.
- **Ticket Mapping**: V2 Ticket Enums (`_TICKET`) are correctly mapped in the reward delivery logic.
- **Testing Strategy**: Adopted Mock-based Unit Testing for Logic Verification to ensure reliability without DB session overhead.


