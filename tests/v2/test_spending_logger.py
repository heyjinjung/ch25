"""
지출 통합 원장 테스트
"""
from datetime import datetime, date
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User
from app.v2.services.spending_logger_service import SpendingLoggerService
from app.v2.services.paste_import_service import PasteImportService


@pytest.fixture
def test_user(db: Session) -> V2User:
    user = V2User(
        cc_id="TEST_SPENDING_USER",
        nickname="지출테스트유저",
        level=1,
        xp=0,
        total_charge_amount=0,
        baseline_charge_amount=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestGetOperationalDateKST:
    def test_before_9am_returns_yesterday(self):
        from zoneinfo import ZoneInfo
        kst = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 5, 8, 59, tzinfo=kst)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 4)

    def test_at_9am_returns_today(self):
        from zoneinfo import ZoneInfo
        kst = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 5, 9, 0, tzinfo=kst)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 5)

    def test_after_9am_returns_today(self):
        from zoneinfo import ZoneInfo
        kst = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 5, 23, 59, tzinfo=kst)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 5)

    def test_naive_datetime_assumes_utc(self):
        # 2026-02-05 00:30 UTC -> 09:30 KST (same day)
        test_time = datetime(2026, 2, 5, 0, 30)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 5)


class TestLogSpending:
    def test_hq_withdrawal_creates_record(self, db: Session, test_user: V2User):
        dedup_key = f"test_{uuid4().hex}"
        result = SpendingLoggerService.log_hq_withdrawal(
            db=db,
            user_id=test_user.id,
            amount=50000,
            dedup_key=dedup_key,
        )

        assert result > 0

        from app.v2.models import V2SpendingLedger
        record = db.query(V2SpendingLedger).get(result)

        assert record.amount == 50000
        assert record.spending_source == "HQ_W"
        assert record.transaction_id == f"HQ_W_{dedup_key[:16]}"

    def test_duplicate_returns_zero(self, db: Session, test_user: V2User):
        dedup_key = f"dup_{uuid4().hex}"
        user_id = test_user.id
        result1 = SpendingLoggerService.log_hq_withdrawal(
            db=db,
            user_id=user_id,
            amount=50000,
            dedup_key=dedup_key,
        )

        result2 = SpendingLoggerService.log_hq_withdrawal(
            db=db,
            user_id=user_id,
            amount=50000,
            dedup_key=dedup_key,
        )

        assert result1 > 0
        assert result2 == 0

    def test_invalid_currency_raises(self, db: Session, test_user: V2User):
        with pytest.raises(ValueError):
            SpendingLoggerService.log_spending(
                db=db,
                user_id=test_user.id,
                amount=1000,
                currency_type="INVALID",
                source=SpendingLoggerService.SOURCE_HQ_WITHDRAWAL,
                ref_id="ref_1",
            )

    def test_invalid_source_raises(self, db: Session, test_user: V2User):
        with pytest.raises(ValueError):
            SpendingLoggerService.log_spending(
                db=db,
                user_id=test_user.id,
                amount=1000,
                currency_type=SpendingLoggerService.CURRENCY_KRW,
                source="BAD_SOURCE",
                ref_id="ref_2",
            )

    def test_zero_amount_returns_zero(self, db: Session, test_user: V2User):
        result = SpendingLoggerService.log_spending(
            db=db,
            user_id=test_user.id,
            amount=0,
            currency_type=SpendingLoggerService.CURRENCY_KRW,
            source=SpendingLoggerService.SOURCE_HQ_WITHDRAWAL,
            ref_id="ref_3",
        )

        assert result == 0


class TestParseWithdrawal:
    def test_parse_valid_row(self):
        text = (
            "1\tHJ\t박관종(hjer5429)\t꽁돌이\t26/02/04 16:00\t50,000\t110-***\t박**"
            "\t26/02/04 16:05\t150,000\t정상"
        )

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 1
        assert result[0].nickname == "꽁돌이"
        assert result[0].cc_id == "hjer5429"
        assert result[0].amount == 50000
        assert result[0].hq_status == "정상"

    def test_skip_header_row(self):
        text = "번호\t소속\t이름\t닉네임\t신청 날짜\t환전 금액\t계좌번호\t예금주\t환전 날짜\t배팅금\t상태"

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 0

    def test_parse_cancelled_row(self):
        text = (
            "3\tCC\t이철수(lee456)\t철수아빠\t26/02/04 18:00\t30,000\t456-***\t이**"
            "\t-\t50,000\t취소"
        )

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 0

    def test_parse_invalid_columns(self):
        text = "1\tHJ\t닉네임\t26/02/04 16:00"

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 0

    def test_parse_missing_nickname(self):
        text = (
            "1\tHJ\t박관종(hjer5429)\t\t26/02/04 16:00\t50,000\t110-***\t박**"
            "\t26/02/04 16:05\t150,000\t정상"
        )

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 0

    def test_parse_invalid_withdrawal_date(self):
        text = (
            "1\tHJ\t박관종(hjer5429)\t꽁돌이\t26/02/04 16:00\t50,000\t110-***\t박**"
            "\t-\t150,000\t정상"
        )

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 0
