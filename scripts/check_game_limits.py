from app.db.session import SessionLocal
from app.models.roulette import RouletteConfig
from app.models.dice import DiceConfig
from sqlalchemy import select

def check_game_limits():
    db = SessionLocal()
    try:
        r_configs = db.execute(select(RouletteConfig)).scalars().all()
        d_configs = db.execute(select(DiceConfig)).scalars().all()
        
        print("--- Roulette Configs ---")
        for c in r_configs:
            print(f"ID: {c.id}, Name: {c.name}, Max Spins: {c.max_daily_spins}")
            
        print("\n--- Dice Configs ---")
        for c in d_configs:
            print(f"ID: {c.id}, Name: {c.name}, Max Plays: {c.max_daily_plays}") # Assuming max_daily_plays exists on DiceConfig
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_game_limits()
