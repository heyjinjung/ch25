import argparse
import os
import sys

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.crisis_detection_service import CrisisDetectionService


def main() -> int:
    parser = argparse.ArgumentParser(description="Run daily crisis detection batch.")
    parser.add_argument("--plan-id", type=int, required=True, help="Ops plan ID to attach target lists.")
    parser.add_argument(
        "--scenarios",
        nargs="*",
        default=None,
        help="Scenario IDs to run (default: SCENARIO_01, SCENARIO_03, SCENARIO_05).",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        results = CrisisDetectionService().run_daily(
            db,
            plan_id=args.plan_id,
            scenario_ids=args.scenarios,
        )
        for item in results:
            print(item)
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
