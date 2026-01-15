import sys
import os
from sqlalchemy import select, text

# Add app to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.dice import DiceConfig
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel

def format_reward(type, amount, label=None):
    if label:
        return f"{label} ({amount} {type})"
    return f"{amount} {type}"

def fetch_game_rewards():
    db = SessionLocal()
    try:
        print("### 🎲 Dice Config")
        dice_configs = db.execute(select(DiceConfig).where(DiceConfig.is_active.is_(True))).scalars().all()
        if not dice_configs:
            print("_No active Dice configs found._")
        else:
            print("| ID | Name | WIN Prize | DRAW Prize | LOSE Prize |")
            print("| :--- | :--- | :--- | :--- | :--- |")
            for c in dice_configs:
                win = format_reward(c.win_reward_type, c.win_reward_amount)
                draw = format_reward(c.draw_reward_type, c.draw_reward_amount)
                lose = format_reward(c.lose_reward_type, c.lose_reward_amount)
                print(f"| {c.id} | {c.name} | {win} | {draw} | {lose} |")
        print("\n")

        print("### 🎡 Roulette Config")
        roulette_configs = db.execute(select(RouletteConfig).where(RouletteConfig.is_active.is_(True))).scalars().all()
        if not roulette_configs:
            print("_No active Roulette configs found._")
        else:
            for c in roulette_configs:
                print(f"#### {c.name} (ID: {c.id})")
                segments = db.execute(select(RouletteSegment).where(RouletteSegment.config_id == c.id).order_by(RouletteSegment.slot_index)).scalars().all()
                if not segments:
                    print("_No segments configured._")
                else:
                    print("| Slot | Label | Reward | Weight | Jackpot |")
                    print("| :--- | :--- | :--- | :--- | :--- |")
                    for s in segments:
                        reward = f"{s.reward_amount} {s.reward_type}"
                        jackpot = "🏆" if s.is_jackpot else ""
                        print(f"| {s.slot_index} | {s.label} | {reward} | {s.weight} | {jackpot} |")
                print("\n")

        print("### 🎫 Lottery Config")
        lottery_configs = db.execute(select(LotteryConfig).where(LotteryConfig.is_active.is_(True))).scalars().all()
        if not lottery_configs:
            print("_No active Lottery configs found._")
        else:
            for c in lottery_configs:
                print(f"#### {c.name} (ID: {c.id})")
                prizes = db.execute(select(LotteryPrize).where(LotteryPrize.config_id == c.id).order_by(LotteryPrize.weight.desc())).scalars().all()
                if not prizes:
                    print("_No prizes configured._")
                else:
                    print("| Label | Reward | Weight | Stock | Active |")
                    print("| :--- | :--- | :--- | :--- | :--- |")
                    for p in prizes:
                        reward = f"{p.reward_amount} {p.reward_type}"
                        stock = p.stock if p.stock is not None else "∞"
                        active = "✅" if p.is_active else "❌"
                        print(f"| {p.label} | {reward} | {p.weight} | {stock} | {active} |")
                print("\n")

        print("### 📅 Season Pass Config")
        season_configs = db.execute(select(SeasonPassConfig).where(SeasonPassConfig.is_active.is_(True))).scalars().all()
        if not season_configs:
            print("_No active Season Pass configs found._")
        else:
            for c in season_configs:
                print(f"#### {c.season_name} (ID: {c.id})")
                print(f"- Period: {c.start_date} ~ {c.end_date}")
                print(f"- Max Level: {c.max_level}")
                
                levels = db.execute(select(SeasonPassLevel).where(SeasonPassLevel.season_id == c.id).order_by(SeasonPassLevel.level)).scalars().all()
                if not levels:
                    print("_No levels configured._")
                else:
                    print("| Level | Required XP | Reward | Auto-Claim |")
                    print("| :--- | :--- | :--- | :--- |")
                    for l in levels:
                        reward = f"{l.reward_amount} {l.reward_type}"
                        auto = "✅" if l.auto_claim else "❌"
                        print(f"| {l.level} | {l.required_xp} | {reward} | {auto} |")
                print("\n")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fetch_game_rewards()
