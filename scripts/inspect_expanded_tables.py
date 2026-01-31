from sqlalchemy import text
from app.db.session import SessionLocal

def main():
    db = SessionLocal()
    tables = ['team_member', 'team_battle_event_log', 'v2_admin_message']
    for t in tables:
        print(f"\n--- TABLE: {t} ---")
        try:
            res = db.execute(text(f"SHOW CREATE TABLE {t}")).fetchone()
            if res:
                print(res[1])
        except Exception as e:
            print(f"Error checking {t}: {e}")
    db.close()

if __name__ == "__main__":
    main()
