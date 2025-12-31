import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel

def seed_season_pass_20():
    db = SessionLocal()
    try:
        # 1. Update Config to max_level 20
        config = db.query(SeasonPassConfig).first()
        if not config:
            # Create a default config if none exists (fallback)
            from datetime import date, timedelta
            config = SeasonPassConfig(
                season_name="Season 1",
                start_date=date.today(),
                end_date=date.today() + timedelta(days=90),
                max_level=20,
                base_xp_per_stamp=100,
                is_active=True
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        else:
            config.max_level = 20
            db.commit()
        
        season_id = config.id
        print(f"Using Season ID: {season_id}, max_level={config.max_level}")

        # 2. Define Levels 1-20
        levels_data = [
            (1, 0, "TICKET_ROULETTE", 1),
            (2, 500, "TICKET_DICE", 1),
            (3, 1000, "TICKET_BUNDLE", 3), # Roulette 1, Dice 1, Lottery 1
            (4, 2000, "TICKET_LOTTERY", 1),
            (5, 3500, "TICKET_BUNDLE", 6), # Roulette 3, Dice 3
            (6, 5000, "POINT", 5000),
            (7, 7500, "TICKET_BUNDLE", 7),  # 1만 P + 골드 키 1개
            (8, 10000, "POINT", 10000),
            (9, 15000, "TICKET_ROULETTE", 3),
            (10, 20000, "GOLD_KEY", 1),
            (11, 30000, "TICKET_LOTTERY", 5),
            (12, 40000, "POINT", 50000),
            (13, 55000, "TICKET_DICE", 10),
            (14, 70000, "TICKET_BUNDLE", 12), # 스페셜 번들 (룰5+주5+복2)
            (15, 90000, "TICKET_BUNDLE", 15), # 골드 키 2개 + 10만 P
            (16, 110000, "TICKET_ROULETTE", 10),
            (17, 150000, "TICKET_BUNDLE", 30), # 메가 티켓 번들 (룰10+주10+복10)
            (18, 200000, "POINT", 200000),
            (19, 250000, "GOLD_KEY", 3),
            (20, 300000, "TICKET_BUNDLE", 20), # 다이아몬드 키 3개 + 30만 P (관리자)
        ]

        # 3. Upsert Levels
        for lv, xp, r_type, r_amount in levels_data:
            level_obj = db.query(SeasonPassLevel).filter(
                SeasonPassLevel.season_id == season_id,
                SeasonPassLevel.level == lv
            ).first()
            
            if level_obj:
                level_obj.required_xp = xp
                level_obj.reward_type = r_type
                level_obj.reward_amount = r_amount
            else:
                level_obj = SeasonPassLevel(
                    season_id=season_id,
                    level=lv,
                    required_xp=xp,
                    reward_type=r_type,
                    reward_amount=r_amount,
                    auto_claim=True
                )
                db.add(level_obj)
        
        db.commit()
        print("Successfully seeded Season Pass Levels 1-20.")

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_season_pass_20()
