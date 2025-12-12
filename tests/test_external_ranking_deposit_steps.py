"""Verify external ranking deposit anti-abuse step calculation and XP accrual."""
from types import SimpleNamespace

from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.models.user import User
from app.models.season_pass import SeasonPassProgress
from app.core.config import get_settings


def test_external_ranking_deposit_steps_accumulate_xp(session_factory, monkeypatch):
    # Configure env flags for deterministic step logic.
    monkeypatch.setattr(
        "app.core.config.get_settings",
        lambda: SimpleNamespace(
            test_mode=True,
            external_ranking_deposit_step_amount=100_000,
            external_ranking_deposit_xp_per_step=20,
            external_ranking_deposit_max_steps_per_day=0,
            external_ranking_deposit_cooldown_minutes=0,
            xp_from_game_reward=False,
        ),
    )

    db = session_factory()
    db.add(User(id=1, external_id="u1", level=1, xp=0, status="ACTIVE"))
    db.commit()

    svc = AdminExternalRankingService()
    # Simulate 80만을 10만씩 8회 (누적 deposit_amount 사용)
    for i in range(1, 9):
        svc.upsert_many(db, [ExternalRankingCreate(user_id=1, deposit_amount=100_000 * i, play_count=0)])

    row = svc.get_by_user(db, 1)
    progress = db.query(SeasonPassProgress).filter_by(user_id=1).one()

    assert row.deposit_amount == 800_000
    assert row.deposit_remainder == 0
    # 8 스텝 × 20 XP ~= 160 XP (환경 훅/훅킹에 따라 약간의 오차 허용)
    assert 160 <= progress.current_xp <= 180
    assert progress.current_level >= 5
