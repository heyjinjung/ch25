"""Seed minimal V2 roulette/lottery configs for local verification.

Usage:
    python scripts/seed_v2_game_config.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize


def seed_v2_roulette(db):
    config = (
        db.query(V2RouletteConfig)
        .filter(
            V2RouletteConfig.is_active.is_(True),
            V2RouletteConfig.ticket_type == "ROULETTE_TICKET",
            V2RouletteConfig.grade == "COMMON",
        )
        .order_by(V2RouletteConfig.id.desc())
        .first()
    )
    if not config:
        config = V2RouletteConfig(
            name="V2 Roulette",
            ticket_type="ROULETTE_TICKET",
            is_active=True,
            max_daily_spins=0,
            grade="COMMON",
        )
        db.add(config)
        db.flush()
        print(f"[V2] Created roulette config id={config.id}")
    else:
        print(f"[V2] Using roulette config id={config.id}")

    db.query(V2RouletteSegment).filter(V2RouletteSegment.config_id == config.id).delete()

    segments = [
        (0, "100 P", "POINT", 100, 30, False),
        (1, "200 P", "POINT", 200, 25, False),
        (2, "500 P", "POINT", 500, 15, False),
        (3, "꽝", "NONE", 0, 17, False),
        (4, "200 XP", "GAME_XP", 200, 8, True),
        (5, "잭팟 1만P", "POINT", 10000, 5, True),
    ]
    for slot_index, label, reward_type, reward_amount, weight, is_jackpot in segments:
        db.add(
            V2RouletteSegment(
                config_id=config.id,
                slot_index=slot_index,
                label=label,
                reward_type=reward_type,
                reward_amount=reward_amount,
                weight=weight,
                is_jackpot=is_jackpot,
            )
        )
    print("[V2] Roulette segments seeded")


def seed_v2_lottery(db):
    config = (
        db.query(V2LotteryConfig)
        .filter(V2LotteryConfig.is_active.is_(True))
        .order_by(V2LotteryConfig.id.desc())
        .first()
    )
    if not config:
        config = V2LotteryConfig(
            name="V2 Lottery",
            ticket_type="LOTTERY_TICKET",
            is_active=True,
            max_daily_tickets=0,
            puzzle_piece_probability=0.0,
        )
        db.add(config)
        db.flush()
        print(f"[V2] Created lottery config id={config.id}")
    else:
        print(f"[V2] Using lottery config id={config.id}")

    db.query(V2LotteryPrize).filter(V2LotteryPrize.config_id == config.id).delete()

    prizes = [
        ("50 P", "POINT", 50, 100, 30, True),
        ("100 XP", "GAME_XP", 100, 50, 25, True),
        ("500 P", "POINT", 500, 20, 15, True),
        ("1000 P", "POINT", 1000, 10, 10, True),
        ("잭팟 1만P", "POINT", 10000, None, 5, True),
        ("꽝", "NONE", 0, None, 15, True),
    ]
    for label, reward_type, reward_amount, stock, weight, is_active in prizes:
        db.add(
            V2LotteryPrize(
                config_id=config.id,
                label=label,
                reward_type=reward_type,
                reward_amount=reward_amount,
                stock=stock,
                weight=weight,
                is_active=is_active,
            )
        )
    print("[V2] Lottery prizes seeded")


def main():
    db = SessionLocal()
    try:
        seed_v2_roulette(db)
        seed_v2_lottery(db)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[V2] Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
