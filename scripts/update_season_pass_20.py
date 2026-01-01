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
                base_xp_per_stamp=20, # 1 Stamp = 20 XP (10만원)
                is_active=True
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        else:
            config.max_level = 20
            config.base_xp_per_stamp = 20
            from datetime import date
            # Extend if expired
            if config.end_date < date.today():
                config.end_date = date(2026, 12, 31)
            db.commit()
        
        season_id = config.id
        print(f"Using Season ID: {season_id}, max_level={config.max_level}")

        # 2. Define Levels 1-20 (Target Lv20 = 30M KRW = 300 Stamps = 6,000 XP)
        # Scaled down from 300,000 -> 6,000 (Factor 1/50)
        levels_data = [
            (1, 0, "TICKET_ROULETTE", 1),
            (2, 10, "TICKET_DICE", 1),
            (3, 20, "TICKET_BUNDLE", 3), # Roulette 1, Dice 1, Lottery 1
            (4, 40, "TICKET_LOTTERY", 1),
            (5, 70, "TICKET_BUNDLE", 6), # Roulette 3, Dice 3
            (6, 100, "POINT", 5000),
            (7, 150, "TICKET_BUNDLE", 7),  # 1만 P + 골드 키 1개
            (8, 200, "POINT", 10000),
            (9, 300, "TICKET_ROULETTE", 3),
            (10, 400, "GOLD_KEY", 1),
            (11, 600, "TICKET_LOTTERY", 5),
            (12, 800, "POINT", 50000),
            (13, 1100, "TICKET_DICE", 10),
            (14, 1400, "TICKET_BUNDLE", 12), # 스페셜 번들 (룰5+주5+복2)
            (15, 1800, "TICKET_BUNDLE", 15), # 골드 키 2개 + 10만 P
            (16, 2200, "TICKET_ROULETTE", 10),
            (17, 3000, "TICKET_BUNDLE", 30), # 메가 티켓 번들 (룰10+주10+복10)
            (18, 4000, "POINT", 200000),
            (19, 5000, "GOLD_KEY", 3),
            (20, 6000, "TICKET_BUNDLE", 20), # 다이아몬드 키 3개 + 30만 P (관리자)
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
