import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.api.admin.routes.admin_dashboard import get_dashboard_metrics

def test_metrics():
    db = SessionLocal()
    try:
        print("Testing get_dashboard_metrics(range_hours=24)...")
        response = get_dashboard_metrics(range_hours=24, db=db)
        print("Success!")
        print(f"Active Users: {response.active_users.value}")
        print(f"Game Participation: {response.game_participation.value}")
        print(f"Ticket Usage: {response.ticket_usage.value}")
        print(f"Avg Session: {response.avg_session_time_seconds.value}")
    except Exception as e:
        print(f"Has Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_metrics()
