from app.db.session import SessionLocal
from app.models.roulette import RouletteConfig
from app.models.dice import DiceConfig
from sqlalchemy import select

def seed_game_limits():
    db = SessionLocal()
    try:
        # Seed Roulette Limit
        r_configs = db.execute(select(RouletteConfig)).scalars().all()
        if not r_configs:
            print("No RouletteConfigs found. Creating default...")
            default_r = RouletteConfig(name="Default Roulette", max_daily_spins=50)
            db.add(default_r)
            r_configs = [default_r]
        
        for c in r_configs:
            print(f"Updating Roulette {c.name} (ID: {c.id}) to 50 plays")
            c.max_daily_spins = 50
            db.add(c)
        
        # Seed Dice Limit
        d_configs = db.execute(select(DiceConfig)).scalars().all()
        if not d_configs:
            print("No DiceConfigs found. Creating default...")
            default_d = DiceConfig(name="Default Dice", max_daily_plays=50) # Assuming signature
            db.add(default_d)
            d_configs = [default_d]

        for c in d_configs:
            if hasattr(c, "max_daily_plays"):
                print(f"Updating Dice {c.name} (ID: {c.id}) to 50 plays")
                c.max_daily_plays = 50
                db.add(c)
            else:
                print(f"DiceConfig {c.id} has no max_daily_plays field!")

        db.commit()
        print("Done seeding game limits to 50.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_game_limits()
