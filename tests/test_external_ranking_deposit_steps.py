"""Verify external ranking deposit anti-abuse step calculation and XP accrual."""
from datetime import date, timedelta
from types import SimpleNamespace

from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.models.user import User
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel, SeasonPassProgress
from app.core.config import get_settings


def test_external_ranking_deposit_steps_accumulate_xp(session_factory, monkeypatch):
    # Configure env flags for deterministic step logic.
    patched_settings = lambda: SimpleNamespace(
        test_mode=True,
        external_ranking_deposit_step_amount=100_000,
        external_ranking_deposit_xp_per_step=20,
        external_ranking_deposit_max_steps_per_day=0,
        external_ranking_deposit_cooldown_minutes=0,
        xp_from_game_reward=False,
    )
    monkeypatch.setattr("app.core.config.get_settings", patched_settings)
    # AdminExternalRankingService가 모듈 레벨에서 get_settings를 import한 경우까지 커버
    monkeypatch.setattr("app.services.admin_external_ranking_service.get_settings", patched_settings)

    db = session_factory()
    today = date.today()
    season = SeasonPassConfig(
        season_name="Deposit-Step-Season",
        start_date=today - timedelta(days=1),
        end_date=today + timedelta(days=7),
        max_level=10,
        base_xp_per_stamp=10,
        is_active=True,
    )
    db.add(season)
    db.flush()

    # 40xp 단위로 레벨업하도록 간단한 레벨 시드 (160xp면 최소 Lv5)
    for lvl in range(1, 11):
        db.add(
            SeasonPassLevel(
                season_id=season.id,
                level=lvl,
                required_xp=(lvl - 1) * 40,
                reward_type="POINT",
                reward_amount=1,
                auto_claim=True,
            )
        )

    db.add(User(id=1, external_id="u1", level=1, xp=0, status="ACTIVE"))
    db.commit()

    svc = AdminExternalRankingService()
    # Simulate 80만을 10만씩 8회 (누적 deposit_amount 사용)
    for i in range(1, 9):
        svc.upsert_many(db, [ExternalRankingCreate(user_id=1, deposit_amount=100_000 * i, play_count=0)])

    row = svc.get_by_user(db, 1)
    progress = db.query(SeasonPassProgress).filter_by(user_id=1, season_id=season.id).one()

    assert row.deposit_amount == 800_000
    assert row.deposit_remainder == 0
    # 8 스텝 × 20 XP ~= 160 XP (환경 훅/훅킹에 따라 약간의 오차 허용)
    assert 160 <= progress.current_xp <= 180
    assert progress.current_level >= 5
