"""
Test: Admin Economy - latency evidence deposit dropdown data source
목표: app/v2/api/admin/economy_routes.py::list_unmatched_deposits 커버리지 확장

- HQDailyDepositLog 기반
- evidence에 이미 매칭된 로그 제외
- hours 컷오프 적용
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.v2.api.admin import economy_routes
from app.v2.api.admin import unmatched_deposit_routes
from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
from app.v2.schemas.v2_unmatched_deposit import UnmatchedDepositLinkRequest, UnmatchedDepositIgnoreRequest
from app.v2.services.unmatched_deposit_log_service import UnmatchedDepositLogService


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


def test_economy_routes_helper_functions_cover_core_mappings():
    assert economy_routes._classify_product_category("ROULETTE_TICKET") == "GAME_TICKET"
    assert economy_routes._classify_product_category("vault") == "VAULT"
    assert economy_routes._classify_product_category("CHICKEN_GIFTICON_5000") == "GIFTICON"
    assert economy_routes._classify_product_category("NONE") == "SPECIAL"

    products = economy_routes._build_sot_shop_catalog_defaults()
    assert isinstance(products, list)
    assert any(p.get("sku") == "SOT_ROULETTE_TICKET" for p in products)
    assert all("reward_type" in p and "cost_amount" in p for p in products)


def test_unmatched_deposit_routes_role_guards_enforced(db):
    with pytest.raises(HTTPException) as exc:
        unmatched_deposit_routes.link_unmatched_deposit(
            unmatched_id=1,
            request=UnmatchedDepositLinkRequest(user_id=9001),
            db=db,
            admin_info=(1, "USER"),
        )
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        unmatched_deposit_routes.ignore_unmatched_deposit(
            unmatched_id=1,
            request=UnmatchedDepositIgnoreRequest(reason="nope"),
            db=db,
            admin_info=(1, "USER"),
        )
    assert exc2.value.status_code == 403

    with pytest.raises(HTTPException) as exc3:
        unmatched_deposit_routes.cleanup_old_unmatched_logs(
            db=db,
            admin_info=(1, "ADMIN"),
        )
    assert exc3.value.status_code == 403


def test_unmatched_deposit_routes_list_maps_suggestions(monkeypatch, db):
    now = datetime.utcnow()

    def _fake_list_unmatched(self, *, hours, status_filter, limit, offset, include_suggestions):
        assert include_suggestions is True
        return (
            [
                {
                    "id": 123,
                    "source": "HQ",
                    "raw_cc_id": "cc_1",
                    "raw_nickname": "nick_1",
                    "total_charge": 1000,
                    "prev_total": 0,
                    "delta": 1000,
                    "kst_date": date(2026, 2, 12),
                    "status": "UNMATCHED",
                    "reason": None,
                    "matched_user_id": None,
                    "matched_at": None,
                    "processed_at": None,
                    "admin_id": None,
                    "created_at": now,
                    "suggestions": [
                        {"user_id": 9001, "nickname": "u9001", "cc_id": "x", "similarity": 87.0}
                    ],
                }
            ],
            1,
            {"unmatched": 1, "ambiguous": 0, "matched_today": 0},
        )

    monkeypatch.setattr(UnmatchedDepositLogService, "list_unmatched", _fake_list_unmatched)

    res = unmatched_deposit_routes.list_unmatched_deposits(
        hours=24,
        status="UNMATCHED",
        limit=50,
        offset=0,
        db=db,
        admin_info=(9000, "ADMIN"),
    )
    assert res.total == 1
    assert res.stats.unmatched == 1
    assert res.items[0].id == 123
    assert res.items[0].suggestions[0].user_id == 9001

