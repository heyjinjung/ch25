from sqlalchemy import inspect
from app.db.session import SessionLocal

def main():
    db = SessionLocal()
    ins = inspect(db.get_bind())
    tables = ins.get_table_names()
    print("--- All Tables ---")
    for t in sorted(tables):
        print(t)
    db.close()

if __name__ == "__main__":
    main()
