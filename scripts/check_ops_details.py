import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.admin_dashboard_service import AdminDashboardService

def test_metrics():
    db = SessionLocal()
    service = AdminDashboardService()
    
    metrics = [
        "churn_risk",
        "today_active",
        "today_deposit", 
        "welcome_retention",
        "today_game_plays",
        "external_ranking_deposit",
        "external_ranking_play_count",
        "total_vault_balance",
        "total_inventory_liability"
    ]

    print("=== Testing Admin Dashboard Metrics ===")
    
    for key in metrics:
        try:
            print(f"\n[Testing] {key}...", end="")
            results = service.get_metric_details(db, key)
            print(f" OK ({len(results)} items)")
            if len(results) > 0:
                print(f"  Sample: {results[0]}")
        except Exception as e:
            print(f" FAIL")
            print(f"  Error: {e}")
            import traceback
            traceback.print_exc()

    db.close()

if __name__ == "__main__":
    test_metrics()
