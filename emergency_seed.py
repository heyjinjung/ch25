import hashlib
from datetime import datetime
from app.db.session import SessionLocal
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.v2.models.v2_dice import V2DiceConfig
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize

def seed():
    db = SessionLocal()
    try:
        # 1. Restore Admin
        admin = db.query(User).filter(User.external_id == "admin").first()
        if not admin:
            admin = User(external_id="admin", nickname="Administrator")
            admin.password_hash = hashlib.sha256("2026".encode("utf-8")).hexdigest()
            db.add(admin)
            db.flush()
            profile = AdminUserProfile(user_id=admin.id, external_id="admin", tags=["ROLE_ADMIN"])
            db.add(profile)
            print("Admin account restored.")

        # 2. Seed Dice Config
        if not db.query(V2DiceConfig).first():
            dice = V2DiceConfig(
                name="Default Dice Config",
                ticket_type="DICE_TICKET",
                is_active=True,
                max_daily_plays=10,
                win_probability=0.4,
                draw_probability=0.1,
                lose_probability=0.5,
                win_reward_type="VAULT",
                win_reward_amount=1000,
                draw_reward_type="VAULT",
                draw_reward_amount=500,
                lose_reward_type="NONE",
                lose_reward_amount=0,
                daily_gain_cap=20000,
                enable_golden_hour=True,
                golden_hour_multiplier=2.0
            )
            db.add(dice)
            print("Dice config seeded.")

        # 3. Seed Roulette Config (COMMON)
        if not db.query(V2RouletteConfig).filter(V2RouletteConfig.grade == "COMMON").first():
            roulette = V2RouletteConfig(
                name="Common Roulette",
                grade="COMMON",
                ticket_type="ROULETTE_TICKET",
                is_active=True,
                max_daily_spins=10
            )
            db.add(roulette)
            db.flush()
            
            # 6 Segments
            segments = [
                ("100 Points", "VAULT", 100, 50, False),
                ("200 Points", "VAULT", 200, 30, False),
                ("500 Points", "VAULT", 500, 10, False),
                ("1000 Points", "VAULT", 1000, 5, False),
                ("DICE TICKET", "DICE_TICKET", 1, 4, False),
                ("JACKPOT", "VAULT", 10000, 1, True),
            ]
            for i, (label, r_type, r_amt, weight, is_jp) in enumerate(segments):
                seg = V2RouletteSegment(
                    config_id=roulette.id,
                    slot_index=i,
                    label=label,
                    reward_type=r_type,
                    reward_amount=r_amt,
                    weight=weight,
                    is_jackpot=is_jp
                )
                db.add(seg)
            print("Roulette config and segments seeded.")

        # 4. Seed Lottery Config
        if not db.query(V2LotteryConfig).first():
            lottery = V2LotteryConfig(
                name="Default Lottery",
                ticket_type="LOTTERY_TICKET",
                is_active=True,
                max_daily_tickets=5,
                puzzle_piece_probability=10.0
            )
            db.add(lottery)
            db.flush()
            
            prizes = [
                ("1st Prize", "VAULT", 5000, 1, 100),
                ("2nd Prize", "VAULT", 1000, 5, 500),
                ("3rd Prize", "VAULT", 500, 10, 1000),
                ("4th Prize", "VAULT", 100, 84, None),
            ]
            for label, r_type, r_amt, weight, stock in prizes:
                p = V2LotteryPrize(
                    config_id=lottery.id,
                    label=label,
                    reward_type=r_type,
                    reward_amount=r_amt,
                    weight=weight,
                    stock=stock,
                    is_active=True
                )
                db.add(p)
            print("Lottery config and prizes seeded.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
