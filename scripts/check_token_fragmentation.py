
from sqlalchemy import create_engine, text

DB_URL = "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event"

def check_token_fragmentation():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("=== Distinct Token Types in user_game_wallet ===")
        result = conn.execute(text("SELECT token_type, count(*) FROM user_game_wallet GROUP BY token_type"))
        for row in result:
            print(f" - {row[0]}: {row[1]} rows")
            
        print("\n=== Users with multiple entries for same game (Fragmentation Check) ===")
        # Check for users having both ROULETTE_COIN and ROULETTE_TICKET
        frag_check = conn.execute(text("""
            SELECT user_id, 
                   COUNT(CASE WHEN token_type = 'ROULETTE_COIN' THEN 1 END) as coin_count,
                   COUNT(CASE WHEN token_type = 'ROULETTE_TICKET' THEN 1 END) as ticket_count
            FROM user_game_wallet
            GROUP BY user_id
            HAVING coin_count > 0 AND ticket_count > 0
        """))
        found = False
        for row in frag_check:
            print(f"User {row[0]} has both ROULETTE_COIN and ROULETTE_TICKET!")
            found = True
        
        if not found:
            print("No Roulette fragmentation found.")

if __name__ == "__main__":
    check_token_fragmentation()
