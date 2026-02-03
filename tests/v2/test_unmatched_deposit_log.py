"""Tests for HQ Margin unmatched deposit log and matching logic."""
from __future__ import annotations

import csv
import tempfile
from pathlib import Path

import pytest

from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_external_deposit_unmatched import V2ExternalDepositUnmatched, UnmatchedStatus, UnmatchedReason
from app.v2.services.unmatched_deposit_log_service import UnmatchedDepositLogService
from app.v2.services.hq_margin_import_service import HQMarginImportService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService


def create_user(
    db,
    *,
    cc_id: str,
    nickname: str | None = None,
    external_nickname: str | None = None,
    telegram_username: str | None = None,
) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname=nickname,
        external_nickname=external_nickname,
        telegram_username=telegram_username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestMatchV2User:
    def test_match_priority_cc_id(self, db):
        user = create_user(db, cc_id="ABC123", nickname="nick1")
        matched, status = HQMarginImportService._match_v2_user(db, "abc123", None)
        assert status == "MATCHED"
        assert matched.id == user.id

    def test_match_external_nickname(self, db):
        user = create_user(db, cc_id="U002", external_nickname="extNick")
        matched, status = HQMarginImportService._match_v2_user(db, "nope", "extnick")
        assert status == "MATCHED"
        assert matched.id == user.id

    def test_ambiguous_nickname(self, db):
        create_user(db, cc_id="U003", nickname="dupe")
        create_user(db, cc_id="U004", nickname="dupe")
        matched, status = HQMarginImportService._match_v2_user(db, "nope", "dupe")
        assert matched is None
        assert status == "AMBIGUOUS"


class TestUnmatchedDepositLogService:
    def test_save_and_list_with_suggestions(self, db):
        create_user(db, cc_id="U010", nickname="영하20도")
        service = UnmatchedDepositLogService(db)
        service.save_unmatched(
            raw_cc_id="U999",
            raw_nickname="영하19도",
            total_charge=200_000,
            status=UnmatchedStatus.UNMATCHED.value,
            reason=UnmatchedReason.USER_NOT_FOUND.value,
        )
        items, total, stats = service.list_unmatched(hours=24, status_filter="UNMATCHED")
        assert total == 1
        assert stats["unmatched"] == 1
        assert items[0]["status"] == UnmatchedStatus.UNMATCHED.value
        assert isinstance(items[0]["suggestions"], list)

    def test_link_to_user_with_mocked_cc_deposit(self, db, monkeypatch):
        user = create_user(db, cc_id="U020", nickname="linkme")
        db.add(V2UserSegment(user_id=user.id, segment="VIP"))
        db.commit()

        service = UnmatchedDepositLogService(db)
        log = service.save_unmatched(
            raw_cc_id="U020",
            raw_nickname="linkme",
            total_charge=300_000,
            status=UnmatchedStatus.UNMATCHED.value,
            reason=UnmatchedReason.USER_NOT_FOUND.value,
        )

        def _fake_upsert_many(_db, _payloads, now=None):
            return []

        monkeypatch.setattr(V2AdminCCDepositService, "upsert_many", _fake_upsert_many)

        result = service.link_to_user(unmatched_id=log.id, user_id=user.id, admin_id=1)
        assert result["success"] is True
        assert result["result"]["user_id"] == user.id
        assert result["result"]["xp_granted"] == 60

        refreshed = db.query(V2ExternalDepositUnmatched).filter(V2ExternalDepositUnmatched.id == log.id).first()
        assert refreshed.status == UnmatchedStatus.MATCHED.value
        assert refreshed.matched_user_id == user.id


class TestHQMarginImportService:
    @pytest.mark.asyncio
    async def test_import_creates_cc_deposit_and_unmatched(self, db, monkeypatch):
        create_user(db, cc_id="MATCH01", nickname="nick01")

        captured = {"count": 0}

        def _fake_upsert_many(_db, payloads, now=None):
            captured["count"] += len(payloads)
            return []

        monkeypatch.setattr(V2AdminCCDepositService, "upsert_many", _fake_upsert_many)

        rows = [
            {
                "이름 (아이디)": "MATCH01",
                "닉네임": "nick01",
                "누적 충전 금액": "100000",
                "총 운영 마진": "1500000",
                "미접속 경과일": "0",
            },
            {
                "이름 (아이디)": "UNMATCH01",
                "닉네임": "ghost",
                "누적 충전 금액": "200000",
                "총 운영 마진": "0",
                "미접속 경과일": "10",
            },
        ]

        tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8", newline="")
        try:
            writer = csv.DictWriter(tmp, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
            tmp.flush()
            tmp.close()

            result = await HQMarginImportService.import_hq_margin_csv(
                db=db,
                file_path=tmp.name,
                admin_id=1,
            )
        finally:
            Path(tmp.name).unlink(missing_ok=True)

        assert result["success"] is True
        assert result["cc_deposit_count"] == 1
        assert result["unmatched_count"] == 1
        assert captured["count"] == 1
