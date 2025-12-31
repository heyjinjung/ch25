from app.db.session import SessionLocal
from app.models.feature import FeatureConfig, FeatureSchedule
from app.models.roulette import RouletteConfig
from app.models.dice import DiceConfig
from app.models.lottery import LotteryConfig
from datetime import date

def check_status():
    db = SessionLocal()
    today = date.today()
    
    print(f"--- Diagnostic Status ({today}) ---")
    
    # 1. Feature Configs
    features = db.query(FeatureConfig).all()
    print(f"\n[Feature Configs]")
    for f in features:
        print(f"- {f.feature_type}: enabled={f.is_enabled}")
        
    # 2. Today's Schedule
    schedule = db.query(FeatureSchedule).filter(FeatureSchedule.date == today).first()
    print(f"\n[Today's Schedule]")
    if schedule:
        print(f"- Active Feature: {schedule.feature_type}, active={schedule.is_active}")
    else:
        print("- NO SCHEDULE FOUND FOR TODAY")
        
    # 3. Game Configs
    roulette = db.query(RouletteConfig).filter(RouletteConfig.is_active == True).all()
    print(f"\n[Roulette Configs]")
    for r in roulette:
        print(f"- {r.name} (ID: {r.id}, Type: {r.ticket_type})")
        
    dice = db.query(DiceConfig).filter(DiceConfig.is_active == True).all()
    print(f"\n[Dice Configs]")
    for d in dice:
        print(f"- {d.name} (ID: {d.id})")
        
    lottery = db.query(LotteryConfig).filter(LotteryConfig.is_active == True).all()
    print(f"\n[Lottery Configs]")
    for l in lottery:
        print(f"- {l.name} (ID: {l.id})")
        
    db.close()

if __name__ == "__main__":
    check_status()
