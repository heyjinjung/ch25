"""V2 segmentation batch runner."""
from __future__ import annotations

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.v2.services.segment_service import V2SegmentService


def main() -> None:
    db = SessionLocal()
    try:
        result = V2SegmentService.segment_all_users(db, now=datetime.utcnow())
        print(f"[V2_SEGMENT] processed={result['processed']} changed={result['changed']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
