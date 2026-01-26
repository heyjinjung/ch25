
import sys
from sqlalchemy import create_engine, text

# Connection strings
DB_URL_V2 = "mysql+pymysql://xmasuser:2026@localhost:3307/v2"
DB_URL_XMAS = "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event"

TABLES = [
    "v2_user",
    "v2_admin_message",
    "v2_shop_order",
    "v2_roulette_config",
    "v2_lottery_config",
    "v2_dice_config",
    "v2_level_reward_table"
]

def get_counts(db_url):
    counts = {}
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            for t in TABLES:
                try:
                    c = conn.execute(text(f"SELECT count(*) FROM {t}")).scalar()
                    counts[t] = c
                except:
                    counts[t] = -1 # Error/Missing
    except Exception as e:
        print(f"Error connecting to {db_url}: {e}")
    return counts

def main():
    print("=== DB Comparison: v2 (Current Env) vs xmas_event (Real Data) ===")
    
    cnt_v2 = get_counts(DB_URL_V2)
    cnt_xmas = get_counts(DB_URL_XMAS)
    
    print(f"{'Table':<25} | {'v2 (Wrong)':<10} | {'xmas_event (Correct)':<10}")
    print("-" * 55)
    
    for t in TABLES:
        v2_val = cnt_v2.get(t, "Err")
        xmas_val = cnt_xmas.get(t, "Err")
        
        # Highlight winner
        marker = " <--" if xmas_val > v2_val else ""
        
        print(f"{t:<25} | {str(v2_val):<10} | {str(xmas_val):<10}{marker}")

if __name__ == "__main__":
    main()
