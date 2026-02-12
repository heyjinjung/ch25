"""
Test: Admin Economy - latency evidence deposit dropdown data source
목표: app/v2/api/admin/economy_routes.py::list_unmatched_deposits 커버리지 확장

- HQDailyDepositLog 기반
- evidence에 이미 매칭된 로그 제외
- hours 컷오프 적용
"""

from __future__ import annotations

from datetime import datetime, timedelta

from app.v2.api.admin import economy_routes
from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus


def test_list_unmatched_deposits_excludes_matched_and_old_rows(db, base_user):
    now = datetime.utcnow()

    # 1) Unmatched row (should be returned)
    row_unmatched = HQDailyDepositLog(
        dedup_key="dedup_unmatched",
        nickname="nick_unmatched",
        amount=1000,
        deposit_at=now,
        user_id=base_user.id,
        status="MATCHED",
        created_at=now,
    )

    # 2) Matched row (should be filtered out by outer join)
    row_matched = HQDailyDepositLog(
        dedup_key="dedup_matched",
        nickname="nick_matched",
        amount=2000,
        deposit_at=now,
        user_id=base_user.id,
        status="MATCHED",
        created_at=now,
    )

    # 3) Old row (should be filtered out by cutoff)
    row_old = HQDailyDepositLog(
        dedup_key="dedup_old",
        nickname="nick_old",
        amount=3000,
        deposit_at=now - timedelta(hours=48),
        user_id=base_user.id,
        status="MATCHED",
        created_at=now - timedelta(hours=48),
    )

    db.add_all([row_unmatched, row_matched, row_old])
    db.flush()  # assign ids

    evidence = V2UserDepositEvidence(
        user_id=base_user.id,
        tx_id="tx_matched_1",
        image_url=None,
        claimed_amount=2000,
        status=EvidenceStatus.VERIFIED,
        reward_json=None,
        matched_log_id=int(row_matched.id),
        admin_memo=None,
        created_at=now,
        verified_at=now,
    )
    db.add(evidence)
    db.commit()

    rows = economy_routes.list_unmatched_deposits(hours=24, db=db, admin_info=(1, "ADMIN"))
    assert isinstance(rows, list)

    ids = {r.get("id") for r in rows}
    assert int(row_unmatched.id) in ids
    assert int(row_matched.id) not in ids
    assert int(row_old.id) not in ids

    item = next(r for r in rows if int(r.get("id")) == int(row_unmatched.id))
    assert item.get("user_id") == base_user.id
    assert item.get("amount") == 1000
    assert item.get("label") == "nick_unmatched"
