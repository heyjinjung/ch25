from __future__ import annotations

from datetime import datetime, timezone

from app.v2.models import V2User, VaultWithdrawalRequest
from app.v2.services.vault2_service import Vault2Service


def _create_v2_user(db, *, cc_id: str, locked: int, available: int) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname=cc_id,
        vault_locked_balance=locked,
        vault_available_balance=available,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestVault2ServiceStrictPolicy:
    def test_liabilities_sort_and_amount_use_locked_only(self, db):
        """Strict Vault Policy SoT: liabilities는 locked 단일 기준으로 정렬/표시되어야 한다."""
        # user_a: locked는 낮지만 available이 높아 (locked+available) 합산 정렬이면 1등이 될 수 있는 케이스
        user_a = _create_v2_user(db, cc_id="liab_a", locked=90, available=100)
        # user_b: locked가 더 높음
        user_b = _create_v2_user(db, cc_id="liab_b", locked=100, available=0)

        svc = Vault2Service()
        rows = svc.get_vault_detail_stats(db, type="liabilities", limit=10)

        assert rows[0]["user_id"] == user_b.id
        assert rows[0]["amount"] == 100

        # user_a도 amount는 locked만 반영
        row_a = next(r for r in rows if r["user_id"] == user_a.id)
        assert row_a["amount"] == 90
        assert row_a["meta"]["locked"] == 90
        assert row_a["meta"]["available"] == 100

    def test_get_vault_stats_total_liabilities_equals_total_locked(self, db):
        """Strict Vault Policy SoT: total_liabilities는 locked 단일(예약금 포함해도 locked 내부)로 계산한다."""
        u1 = _create_v2_user(db, cc_id="stats_1", locked=100, available=50)
        _create_v2_user(db, cc_id="stats_2", locked=20, available=70)

        db.add(VaultWithdrawalRequest(user_id=u1.id, amount=10, status="PENDING"))
        db.commit()

        svc = Vault2Service()
        stats = svc.get_vault_stats(db)

        assert stats["total_locked"] == 120
        assert stats["total_available"] == 0
        assert stats["total_reserved"] == 10
        assert stats["total_liabilities"] == 120
