"""
DB 초기화 및 테스트 계정 10개 생성 스크립트

Usage:
    python scripts/reset_db_with_test_users.py

주의:
- 어드민 계정을 제외한 모든 데이터를 삭제합니다.
- 테스트 계정 10개를 생성합니다.
- 게임 설정 데이터를 다시 시드합니다.
"""
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


def confirm_reset():
    """Confirm database reset with user."""
    print("\n" + "=" * 60)
    print("WARNING: Database Reset")
    print("=" * 60)
    print("The following operations will be performed:")
    print("  1. Delete all non-admin user data")
    print("  2. Delete all related transaction/log data")
    print("  3. Create 10 test accounts")
    print("  4. Re-seed game configuration data")
    print("\nAdmin accounts will be preserved.")
    print("=" * 60)

    response = input("\nContinue? (yes/no): ").strip().lower()
    return response in ["yes", "y"]


def get_admin_user_ids(db):
    """어드민 유저 ID 목록을 가져옵니다."""
    result = db.execute(
        text("SELECT id FROM user WHERE role IN ('SUPER_ADMIN', 'OPERATOR', 'VIEWER')")
    )
    admin_ids = [row[0] for row in result.fetchall()]
    print(f"  ✓ 보존할 어드민 계정: {len(admin_ids)}개 (IDs: {admin_ids})")
    return admin_ids


def clear_non_admin_data(db, admin_ids):
    """어드민이 아닌 모든 유저 데이터를 삭제합니다."""
    print("\n=== 데이터 삭제 중... ===")

    if not admin_ids:
        admin_ids = [0]  # Empty list handling

    admin_ids_str = ",".join(map(str, admin_ids))

    # 1. 트랜잭션 및 로그 데이터 삭제
    tables_to_clear = [
        "user_mission_progress",
        "user_daily_gift",
        "user_game_wallet",
        "user_inventory_item",
        "user_streak",
        "roulette_spin_history",
        "dice_play_history",
        "lottery_purchase_history",
        "vault_transaction",
        "cc_deposit_log",
        "external_ranking_record",
        "audit_log",
        "reward_claim_log",
    ]

    for table in tables_to_clear:
        try:
            result = db.execute(
                text(f"DELETE FROM {table} WHERE user_id NOT IN ({admin_ids_str})")
            )
            print(f"  ✓ {table}: {result.rowcount}개 행 삭제")
        except Exception as e:
            print(f"  ⚠️  {table}: {str(e)}")

    # 2. 일반 유저 삭제
    result = db.execute(
        text(f"DELETE FROM user WHERE id NOT IN ({admin_ids_str})")
    )
    print(f"  ✓ user: {result.rowcount}개 계정 삭제")

    db.commit()
    print("\n  ✅ 데이터 삭제 완료")


def create_test_users(db):
    """테스트 계정 10개를 생성합니다."""
    print("\n=== 테스트 계정 생성 중... ===")

    test_users = [
        {"external_id": "test-user-001", "nickname": "테스터01", "telegram_id": None},
        {"external_id": "test-user-002", "nickname": "테스터02", "telegram_id": None},
        {"external_id": "test-user-003", "nickname": "테스터03", "telegram_id": None},
        {"external_id": "test-user-004", "nickname": "테스터04", "telegram_id": None},
        {"external_id": "test-user-005", "nickname": "테스터05", "telegram_id": None},
        {"external_id": "test-user-006", "nickname": "테스터06", "telegram_id": None},
        {"external_id": "test-user-007", "nickname": "테스터07", "telegram_id": None},
        {"external_id": "test-user-008", "nickname": "테스터08", "telegram_id": None},
        {"external_id": "test-user-009", "nickname": "테스터09", "telegram_id": None},
        {"external_id": "test-user-010", "nickname": "테스터10", "telegram_id": None},
    ]

    created_ids = []

    for user_data in test_users:
        db.execute(
            text(
                """
                INSERT INTO user (
                    external_id,
                    nickname,
                    telegram_id,
                    status,
                    role,
                    level,
                    xp,
                    vault_locked_balance,
                    vault_spent_total,
                    created_at,
                    updated_at
                )
                VALUES (
                    :external_id,
                    :nickname,
                    :telegram_id,
                    'ACTIVE',
                    'USER',
                    1,
                    0,
                    0,
                    0,
                    NOW(),
                    NOW()
                )
                """
            ),
            user_data,
        )
        user_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        created_ids.append(user_id)
        print(f"  ✓ {user_data['nickname']} (ID: {user_id}, External: {user_data['external_id']})")

    db.commit()
    print(f"\n  ✅ 테스트 계정 {len(created_ids)}개 생성 완료")
    return created_ids


def seed_game_configs(db):
    """게임 설정 데이터를 시드합니다."""
    print("\n=== 게임 설정 시드 중... ===")

    # Feature Config
    features = [
        ("ROULETTE", "룰렛", "/roulette", True),
        ("DICE", "다이스", "/dice", True),
        ("LOTTERY", "복권", "/lottery", True),
        ("RANKING", "랭킹", "/ranking", True),
        ("SEASON_PASS", "시즌 패스", "/season-pass", True),
    ]

    for feature_type, title, page_path, is_enabled in features:
        db.execute(
            text(
                """
                INSERT INTO feature_config (feature_type, title, page_path, is_enabled, created_at, updated_at)
                VALUES (:feature_type, :title, :page_path, :is_enabled, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    title=:title,
                    page_path=:page_path,
                    is_enabled=:is_enabled,
                    updated_at=NOW()
                """
            ),
            {
                "feature_type": feature_type,
                "title": title,
                "page_path": page_path,
                "is_enabled": is_enabled,
            },
        )
    print("  ✓ Feature Config 생성")

    # Feature Schedule (오늘)
    today = datetime.now(ZoneInfo("Asia/Seoul")).date()
    db.execute(
        text(
            """
            INSERT INTO feature_schedule (`date`, feature_type, is_active, created_at, updated_at)
            VALUES (:today, 'ROULETTE', TRUE, NOW(), NOW())
            ON DUPLICATE KEY UPDATE feature_type='ROULETTE', is_active=TRUE, updated_at=NOW()
            """
        ),
        {"today": today},
    )
    print(f"  ✓ Feature Schedule ({today}) 생성")

    # Roulette Config
    cfg = db.execute(text("SELECT id FROM roulette_config WHERE is_active=TRUE LIMIT 1"))
    cfg_id = cfg.scalar()
    if not cfg_id:
        db.execute(
            text(
                """
                INSERT INTO roulette_config (name, is_active, max_daily_spins, created_at, updated_at)
                VALUES ('기본 룰렛', TRUE, 0, NOW(), NOW())
                """
            )
        )
        cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

    db.execute(text("DELETE FROM roulette_segment WHERE config_id = :cfg"), {"cfg": cfg_id})

    segments = [
        (0, "100 P", "VAULT", 100, 30, False),
        (1, "200 P", "VAULT", 200, 25, False),
        (2, "500 P", "VAULT", 500, 15, False),
        (3, "꽝", "NONE", 0, 17, False),
        (4, "다이아몬드 200", "DIAMOND", 200, 8, True),
        (5, "잭팟 1만P", "VAULT", 10000, 5, True),
    ]

    for slot_index, label, reward_type, reward_amount, weight, is_jackpot in segments:
        db.execute(
            text(
                """
                INSERT INTO roulette_segment (
                    config_id, slot_index, label, reward_type, reward_amount,
                    weight, is_jackpot, created_at, updated_at
                )
                VALUES (:cfg, :slot_index, :label, :reward_type, :reward_amount,
                        :weight, :is_jackpot, NOW(), NOW())
                """
            ),
            {
                "cfg": cfg_id,
                "slot_index": slot_index,
                "label": label,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "weight": weight,
                "is_jackpot": is_jackpot,
            },
        )
    print(f"  ✓ Roulette Config (ID: {cfg_id}) 생성")

    # Lottery Config
    lottery_cfg = db.execute(text("SELECT id FROM lottery_config WHERE is_active=TRUE LIMIT 1"))
    lottery_cfg_id = lottery_cfg.scalar()
    if not lottery_cfg_id:
        db.execute(
            text(
                """
                INSERT INTO lottery_config (name, is_active, max_daily_tickets, created_at, updated_at)
                VALUES ('기본 복권', TRUE, 0, NOW(), NOW())
                """
            )
        )
        lottery_cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

    db.execute(text("DELETE FROM lottery_prize WHERE config_id = :cfg"), {"cfg": lottery_cfg_id})

    prizes = [
        ("50 P", "VAULT", 50, 100, 30, True),
        ("다이아몬드 100", "DIAMOND", 100, 50, 25, True),
        ("500 P", "VAULT", 500, 20, 15, True),
        ("1,000 P", "VAULT", 1000, 10, 10, True),
        ("잭팟 1만P", "VAULT", 10000, None, 5, True),
        ("꽝", "NONE", 0, None, 15, True),
    ]

    for label, reward_type, reward_amount, stock, weight, is_active in prizes:
        db.execute(
            text(
                """
                INSERT INTO lottery_prize (
                    config_id, label, reward_type, reward_amount,
                    stock, weight, is_active, created_at, updated_at
                )
                VALUES (:cfg, :label, :reward_type, :reward_amount,
                        :stock, :weight, :is_active, NOW(), NOW())
                """
            ),
            {
                "cfg": lottery_cfg_id,
                "label": label,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "stock": stock,
                "weight": weight,
                "is_active": is_active,
            },
        )
    print(f"  ✓ Lottery Config (ID: {lottery_cfg_id}) 생성")

    # Dice Config
    dice_cfg_id = db.execute(text("SELECT id FROM dice_config WHERE is_active=TRUE LIMIT 1")).scalar()

    params = {
        "name": "기본 다이스",
        "is_active": True,
        "max_daily_plays": 0,
        "win_reward_type": "VAULT",
        "win_reward_amount": 200,
        "draw_reward_type": "VAULT",
        "draw_reward_amount": 50,
        "lose_reward_type": "NONE",
        "lose_reward_amount": 0,
    }

    if dice_cfg_id:
        db.execute(
            text(
                """
                UPDATE dice_config
                SET name=:name,
                    is_active=:is_active,
                    max_daily_plays=:max_daily_plays,
                    win_reward_type=:win_reward_type,
                    win_reward_amount=:win_reward_amount,
                    draw_reward_type=:draw_reward_type,
                    draw_reward_amount=:draw_reward_amount,
                    lose_reward_type=:lose_reward_type,
                    lose_reward_amount=:lose_reward_amount,
                    updated_at=NOW()
                WHERE id=:id
                """
            ),
            {**params, "id": dice_cfg_id},
        )
    else:
        db.execute(
            text(
                """
                INSERT INTO dice_config (
                    name, is_active, max_daily_plays,
                    win_reward_type, win_reward_amount,
                    draw_reward_type, draw_reward_amount,
                    lose_reward_type, lose_reward_amount,
                    created_at, updated_at
                )
                VALUES (
                    :name, :is_active, :max_daily_plays,
                    :win_reward_type, :win_reward_amount,
                    :draw_reward_type, :draw_reward_amount,
                    :lose_reward_type, :lose_reward_amount,
                    NOW(), NOW()
                )
                """
            ),
            params,
        )
        dice_cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

    print(f"  ✓ Dice Config (ID: {dice_cfg_id}) 생성")

    db.commit()
    print("\n  ✅ 게임 설정 시드 완료")


def initialize_user_wallets(db, user_ids):
    """테스트 유저들의 게임 지갑을 초기화합니다."""
    print("\n=== 게임 지갑 초기화 중... ===")

    wallet_types = [
        "ROULETTE_TICKET",
        "DICE_TICKET",
        "LOTTERY_TICKET",
        "DIAMOND",
    ]

    for user_id in user_ids:
        for wallet_type in wallet_types:
            initial_balance = 10 if "TICKET" in wallet_type else 1000

            db.execute(
                text(
                    """
                    INSERT INTO user_game_wallet (user_id, wallet_type, balance, created_at, updated_at)
                    VALUES (:user_id, :wallet_type, :balance, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE balance = :balance, updated_at = NOW()
                    """
                ),
                {
                    "user_id": user_id,
                    "wallet_type": wallet_type,
                    "balance": initial_balance,
                },
            )
        print(f"  ✓ User {user_id}: 지갑 초기화 (각 티켓 10개, 다이아 1000개)")

    db.commit()
    print("\n  ✅ 게임 지갑 초기화 완료")


def main():
    print("=" * 60)
    print("DB Reset & Test User Creation")
    print("=" * 60)
    print(f"Database: {DATABASE_URL[:50]}...")

    if not confirm_reset():
        print("\nOperation cancelled.")
        sys.exit(0)

    db = SessionLocal()

    try:
        # 1. 어드민 계정 확인
        admin_ids = get_admin_user_ids(db)

        # 2. 일반 유저 데이터 삭제
        clear_non_admin_data(db, admin_ids)

        # 3. 테스트 계정 생성
        test_user_ids = create_test_users(db)

        # 4. 게임 설정 시드
        seed_game_configs(db)

        # 5. 게임 지갑 초기화
        initialize_user_wallets(db, test_user_ids)

        print("\n" + "=" * 60)
        print("SUCCESS: Reset Complete!")
        print("=" * 60)
        print(f"\nCreated Accounts:")
        print(f"  - Test Users: {len(test_user_ids)}")
        print(f"  - Admin Users: {len(admin_ids)} (preserved)")
        print("\nInitial Items:")
        print("  - Roulette Tickets: 10")
        print("  - Dice Tickets: 10")
        print("  - Lottery Tickets: 10")
        print("  - Diamond: 1000")
        print("\nTest Account IDs:")
        print("  test-user-001 ~ test-user-010")
        print("\nNext Steps:")
        print("  1. Start backend: uvicorn app.main:app --reload")
        print("  2. Start frontend: npm run dev")
        print("  3. Access: http://localhost:5173")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
