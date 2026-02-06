# V2 Test Execution Log

## 2026-01-20 (Phase 2 Core Economics)

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
| `test_level_xp_deposit_only_strictness` | ✅ Passed | **Critical**: XP can ONLY be acquired via `CC_DEPOSIT`. |
| `test_grant_xp_for_deposit_logic` | ✅ Passed | Verifies math: 100,000 KRW = 20 XP. |
| `test_level_up_and_reward_delivery` | ✅ Passed | Verifies Level 1->2 transition and Reward mapping. |

---

## 2026-01-22 (Phase 3, 4 & Game Economy)

### Summary
- **Execution Time**: 2026-01-22 13:25 KST
- **Scope**: Phase 3 (Dice Admin), Phase 4 (Admin API), Exchange Script (Puzzle Craft)
- **Status**: ✅ All Passed
- **Executor**: Antigravity Agent

### Test Suites Details

#### 1. Phase 3: Dice Admin Integration (`tests/v2_tests/phase3_game/test_dice_admin_integration.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_admin_config_applied` | ✅ Passed | Verifies Admin config settings are correctly loaded. |
| `test_dice_play_and_vault_routing` | ✅ Passed | Verifies point rewards and vault routing (WIN/DRAW/LOSE). |
| `test_golden_hour_multiplier_applied` | ✅ Passed | Verifies 2.0x multiplier during Golden Hour. |
| `test_admin_config_update_reflection` | ✅ Passed | Verifies real-time reflection of admin config updates. |
| `test_win_rate_statistical` | ✅ Passed | Verifies win rate follows configured probability (40%). |

#### 2. Phase 4: Admin API Coverage (`tests/v2_tests/phase4_admin/test_admin_game_config_routes_coverage_extended.py`)
| Test Case | Status | Description |
|---|---|---|
| `test_admin_lottery_config_and_prize_crud` | ✅ Passed | Verifies V2 Lottery Config CRUD operations. |

#### 3. Game Economy: Exchange Script (`scripts/test_exchange_c1c2.py`)
| Action | Status | Description |
|---|---|---|
| `Token Grant (Puzzle Pieces)` | ✅ Passed | Granting C1, C2, J, M puzzle tokens (V2 VARCHAR Support). |
| `Key Crafting (GOLD_KEY)` | ✅ Passed | Crafting GOLD_KEY from puzzles successfully. |

### Key Findings & Actions
- **DB Schema Widened**: `token_type` columns widened to `VARCHAR(50)` (Phase 3/4 support).
- **Enumeration Alignment**: `GameTokenType` refactored for V2 Standard and V1 Alias support.
- **Service Refinement**: `DiceService` reward prioritization and `EventService` mock alignment.
