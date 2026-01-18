"""Daily batch to update predicted_ltv from ExternalRankingData.deposit_amount.

Usage:
  python scripts/update_predicted_ltv_daily.py --dry-run
  python scripts/update_predicted_ltv_daily.py --apply
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

# Add project root to path (so `import app...` works when running as a script)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.models.user_retention_state import UserRetentionState


def _compute_predicted_ltv(deposit_amount: int) -> float:
    # Temporary heuristic: predicted_ltv == deposit_amount
    return float(deposit_amount or 0)


def run(apply: bool = False) -> dict[str, int]:
    db: Session = SessionLocal()
    created = 0
    updated = 0
    skipped = 0
    try:
        users = db.query(User.id).all()
        for (user_id,) in users:
            ranking = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
            deposit_amount = ranking.deposit_amount if ranking else 0
            predicted_ltv = _compute_predicted_ltv(deposit_amount)

            state = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
            if state is None:
                if not apply:
                    created += 1
                    continue
                state = UserRetentionState(user_id=user_id, predicted_ltv=predicted_ltv)
                db.add(state)
                created += 1
            else:
                if state.predicted_ltv == predicted_ltv:
                    skipped += 1
                else:
                    if apply:
                        state.predicted_ltv = predicted_ltv
                        state.updated_at = datetime.utcnow()
                    updated += 1
        if apply:
            db.commit()
        return {"created": created, "updated": updated, "skipped": skipped}
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Update predicted_ltv daily from ExternalRankingData.deposit_amount")
    parser.add_argument("--apply", action="store_true", help="Apply updates to DB")
    parser.add_argument("--dry-run", action="store_true", help="Dry run only")
    args = parser.parse_args()

    apply = bool(args.apply) and not bool(args.dry_run)
    stats = run(apply=apply)
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"[{mode}] created={stats['created']} updated={stats['updated']} skipped={stats['skipped']}")


if __name__ == "__main__":
    main()
