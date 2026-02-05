"""수익/지출 분석 - 지출 원장 반영 테스트."""
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.v2.api.admin.analytics_routes import get_revenue_breakdown, get_revenue_summary
from app.v2.models import ExternalRankingDailyDepositDelta, V2SpendingLedger
from app.v2.models import User, V2User


KST = ZoneInfo("Asia/Seoul")


def _create_users(db: Session, user_id: int) -> None:
    legacy_user = User(
        id=user_id,
        external_id=f"ext_{user_id}",
        nickname=f"legacy_{user_id}",
    )
    v2_user = V2User(
        id=user_id,
        cc_id=f"cc_{user_id}",
        nickname=f"v2_{user_id}",
    )
    db.add(legacy_user)
    db.add(v2_user)
    db.commit()


def _seed_revenue_data(db: Session, kst_date) -> None:
    db.add(
        ExternalRankingDailyDepositDelta(
            user_id=1,
            kst_date=kst_date,
            deposit_delta=100000,
        )
    )
    db.add(
        V2SpendingLedger(
            transaction_id="HQ_W_test_tx",
            user_id=1,
            amount=30000,
            currency_type="KRW",
            converted_krw_amount=30000,
            spending_source="HQ_W",
            kst_date=kst_date,
            metadata_json={"reason": "test"},
        )
    )
    db.commit()


def test_revenue_breakdown_uses_spending_ledger(db: Session):
    kst_date = datetime.now(KST).date()

    _create_users(db, 1)
    _seed_revenue_data(db, kst_date)

    result = get_revenue_breakdown(
        period="daily",
        start_date=kst_date.isoformat(),
        end_date=kst_date.isoformat(),
        db=db,
        admin_info=(1, "ADMIN"),
    )

    assert result.total_revenue == 100000
    assert result.total_expenses == 30000
    assert result.net_income == 70000
    assert len(result.data) == 1
    assert result.data[0].total_withdrawals == 30000


def test_revenue_summary_uses_spending_ledger(db: Session):
    kst_date = datetime.now(KST).date()

    _create_users(db, 1)
    _seed_revenue_data(db, kst_date)

    result = get_revenue_summary(db=db, admin_info=(1, "ADMIN"))

    assert result.today_revenue == 100000
    assert result.today_expenses == 30000
