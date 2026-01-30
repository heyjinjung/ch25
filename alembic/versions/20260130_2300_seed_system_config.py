"""Phase 3: Seed System Config (feature_schedule, app_ui_config)

Revision ID: 20260130_2300_seed_system_config
Revises: 20260130_2200_seed_roulette_segment
Create Date: 2026-01-30

Priority: LOW
Tables: feature_schedule (1 row), app_ui_config (2 rows)
Total: 3 rows

Note: v2_admin_message는 운영/테스트 메시지이므로 시드 데이터에서 제외
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '20260130_2300_seed_system_config'
down_revision = '20260130_2200_seed_roulette'
branch_labels = None
depends_on = None


def _row_exists(conn, table: str, id_val: int) -> bool:
    """Check if row exists by primary key."""
    result = conn.execute(
        text(f"SELECT 1 FROM {table} WHERE id = :id LIMIT 1"),
        {"id": id_val}
    )
    return result.fetchone() is not None


def _row_exists_by_key(conn, table: str, key_col: str, key_val: str) -> bool:
    """Check if row exists by unique key column."""
    result = conn.execute(
        text(f"SELECT 1 FROM {table} WHERE {key_col} = :key LIMIT 1"),
        {"key": key_val}
    )
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    
    # =========================================================================
    # 1. feature_schedule (1 row) - 룰렛 피처 스케줄
    # =========================================================================
    if not _row_exists(conn, "feature_schedule", 1):
        conn.execute(text("""
            INSERT INTO feature_schedule (id, date, feature_type, is_active)
            VALUES (1, '2026-01-23', 'ROULETTE', 1)
        """))
        print("[SEED] feature_schedule: 1 row inserted")
    else:
        print("[SEED] feature_schedule: id=1 already exists, skipped")
    
    # =========================================================================
    # 2. app_ui_config (2 rows) - V2 Shop 상품 설정
    # =========================================================================
    # id=1: v2_shop_products (메인 상품 목록)
    if not _row_exists_by_key(conn, "app_ui_config", "`key`", "v2_shop_products"):
        v2_shop_products_json = '''{"products": [{"sku": "SOT_ROULETTE_TICKET", "name": "룰렛", "cost_type": "POINT", "is_visible": true, "cost_amount": 10000, "reward_type": "ROULETTE_TICKET", "reward_amount": 10}, {"sku": "SOT_LOTTERY_TICKET", "name": "복권", "cost_type": "VAULT", "is_visible": true, "cost_amount": 20000, "reward_type": "LOTTERY_TICKET", "reward_amount": 12}, {"sku": "SOT_STARBUCKS_GIFTICON_10000", "name": "스벅1만", "cost_type": "VAULT", "is_visible": true, "cost_amount": 10000, "reward_type": "STARBUCKS_GIFTICON_10000", "reward_amount": 1}, {"sku": "SOT_PIZZA_GIFTICON_10000", "name": "피자1만", "cost_type": "VAULT", "is_visible": true, "cost_amount": 20000, "reward_type": "PIZZA_GIFTICON_10000", "reward_amount": 1}, {"sku": "SOT_GOLD_KEY_TICKET", "name": "골드키", "cost_type": "VAULT", "is_visible": true, "cost_amount": 100000, "reward_type": "GOLD_KEY_TICKET", "reward_amount": 1}, {"sku": "SOT_DIAMOND_TICKET", "name": "다이아몬드 티켓", "cost_type": "VAULT", "is_visible": true, "cost_amount": 20000, "reward_type": "DIAMOND_TICKET", "reward_amount": 1}, {"sku": "SOT_CHICKEN_GIFTICON_10000", "name": "치킨1만", "cost_type": "VAULT", "is_visible": true, "cost_amount": 5000, "reward_type": "CHICKEN_GIFTICON_10000", "reward_amount": 1}, {"sku": "SOT_DICE_TICKET", "name": "주사위", "cost_type": "VAULT", "is_visible": true, "cost_amount": 100, "reward_type": "DICE_TICKET", "reward_amount": 1}]}'''
        conn.execute(text("""
            INSERT INTO app_ui_config (`key`, value_json)
            VALUES ('v2_shop_products', :json_val)
        """), {"json_val": v2_shop_products_json})
        print("[SEED] app_ui_config: v2_shop_products inserted")
    else:
        print("[SEED] app_ui_config: v2_shop_products already exists, skipped")
    
    # id=2: shop_products (레거시 호환용)
    if not _row_exists_by_key(conn, "app_ui_config", "`key`", "shop_products"):
        shop_products_json = '''{"products": {"TEST_VAULT_ITEM": {"title": "Test Vault Item", "is_active": true, "item_type": "VOUCHER_ROULETTE_COIN_1", "cost_token": "VAULT", "cost_amount": 3000, "item_amount": 5}}}'''
        conn.execute(text("""
            INSERT INTO app_ui_config (`key`, value_json)
            VALUES ('shop_products', :json_val)
        """), {"json_val": shop_products_json})
        print("[SEED] app_ui_config: shop_products inserted")
    else:
        print("[SEED] app_ui_config: shop_products already exists, skipped")
    
    print("[SEED] Phase 3 complete: system config seeded")


def downgrade() -> None:
    conn = op.get_bind()
    
    # app_ui_config
    conn.execute(text("DELETE FROM app_ui_config WHERE `key` = 'v2_shop_products'"))
    conn.execute(text("DELETE FROM app_ui_config WHERE `key` = 'shop_products'"))
    
    # feature_schedule
    conn.execute(text("DELETE FROM feature_schedule WHERE id = 1"))
    
    print("[SEED] Phase 3 downgrade: system config removed")
