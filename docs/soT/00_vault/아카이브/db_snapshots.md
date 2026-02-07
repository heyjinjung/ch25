# DB Snapshots (2026-01-24)

## v2_user (latest 4 rows)
| id | cc_id | vault_locked_balance | updated_at |
|----|-------|----------------------|------------|
| 10 | edge_reward_20260124 | 53000 | 2026-01-24 08:48:12 |
| 9  | edge_mission_20260124 | 3000 | 2026-01-24 01:30:39 |
| 8  | edge_withdraw_20260124 | 14000 | 2026-01-24 01:09:27 |
| 1  | dev_vault_20260124 | 0 | 2026-01-24 00:35:44 |

## vault_withdrawal_request (latest 4 rows)
| id | user_id | amount | status | created_at |
|----|---------|--------|--------|------------|
| 5 | 8 | 10000 | PENDING | 2026-01-23 15:54:57 |
| 3 | 8 | 10000 | APPROVED | 2026-01-23 15:54:49 |
| 4 | 8 | 10000 | APPROVED | 2026-01-23 15:54:49 |
| 2 | 8 | 3000 | APPROVED | 2026-01-23 15:54:22 |

## v2_shop_order (latest 5 rows)
| id | user_id | sku | cost_amount | reward_amount | created_at |
|----|---------|-----|-------------|---------------|------------|
| 5 | 10 | SOT_DIAMOND_FRAGMENT | 500 | 1 | 2026-01-23 23:44:09 |
| 4 | 10 | SOT_DIAMOND_FRAGMENT | 500 | 1 | 2026-01-23 23:40:08 |
| 2 | 8 | SOT_DIAMOND_FRAGMENT | 500 | 1 | 2026-01-23 16:09:27 |
| 3 | 8 | SOT_CHICKEN_GIFTICON_10000 | 5000 | 1 | 2026-01-23 16:09:27 |
| 1 | 8 | SOT_DIAMOND_FRAGMENT | 500 | 1 | 2026-01-23 16:07:09 |

(원본 쿼리 실행: `SELECT ... LIMIT 5;` )
