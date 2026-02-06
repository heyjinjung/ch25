"""V2 Team Battle 포인트 적립 브릿지 테스트.

목적:
- game_common._log_team_battle_points가
  - 활성 시즌이 없으면 스킵
  - 활성 시즌이 있으면 TeamScore/TeamEventLog를 남김
- V2TeamBattleService.ensure_current_season의 운영 정책(자동 생성 금지)을 보장

근거 SoT:
- docs/SOT/00_game/v2_team_battle_sot_ko.md
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest

from app.v2.models import Team, TeamEventLog, TeamMember, TeamScore, TeamSeason, User, V2User
from app.v2.services.game_common import GamePlayContext, _log_team_battle_points
from app.v2.services.team_battle_service import V2TeamBattleService


def _mk_user_pair(db, user_id: int) -> None:
    """TeamMember FK(user.id)와 서비스 조인(V2User.id)을 동시에 만족시키기 위해 둘 다 생성."""
    legacy = User(id=user_id, external_id=f"legacy-{user_id}", nickname=f"legacy-{user_id}")
    v2 = V2User(id=user_id, cc_id=f"cc-{user_id}", nickname=f"v2-{user_id}")
    db.add_all([legacy, v2])
    db.commit()


def _mk_team_with_member(db, team_id: int, user_id: int) -> TeamMember:
    team = Team(id=team_id, name=f"TEAM-{team_id}", icon=None, is_active=True)
    db.add(team)
    db.commit()

    member = TeamMember(user_id=user_id, team_id=team_id, role="member")
    db.add(member)
    db.commit()
    return member


def _mk_active_season(db, season_id: int) -> TeamSeason:
    now = datetime.utcnow()
    season = TeamSeason(
        id=season_id,
        name=f"S{season_id}",
        starts_at=now - timedelta(days=1),
        ends_at=now + timedelta(days=1),
        is_active=True,
        rewards_schema=None,
    )
    db.add(season)
    db.commit()
    return season


class TestTeamBattlePointsBridge:
    def test_ensure_current_season_returns_none_when_missing(self, db):
        svc = V2TeamBattleService()
        assert svc.ensure_current_season(db) is None

    def test_log_team_battle_points_skips_when_no_season(self, db):
        user_id = 101
        _mk_user_pair(db, user_id)
        _mk_team_with_member(db, team_id=1, user_id=user_id)

        ctx = GamePlayContext(user_id=user_id, feature_type="DICE", today=date.today())
        _log_team_battle_points(ctx, db, {"result": "LOSE", "reward_type": "NONE", "reward_amount": 0})

        assert db.query(TeamScore).count() == 0
        assert db.query(TeamEventLog).count() == 0

    def test_log_team_battle_points_writes_score_and_log_when_season_active(self, db):
        user_id = 102
        _mk_user_pair(db, user_id)
        member = _mk_team_with_member(db, team_id=2, user_id=user_id)
        season = _mk_active_season(db, season_id=1)

        ctx = GamePlayContext(user_id=user_id, feature_type="ROULETTE", today=date.today())
        _log_team_battle_points(ctx, db, {"result": "WIN", "reward_type": "VAULT", "reward_amount": 10})

        score = db.get(TeamScore, (member.team_id, season.id))
        assert score is not None
        assert int(score.points) > 0

        logs = (
            db.query(TeamEventLog)
            .filter(TeamEventLog.team_id == member.team_id, TeamEventLog.season_id == season.id)
            .all()
        )
        assert len(logs) == 1
        assert logs[0].action == "GAME_PLAY"
        assert int(logs[0].delta) > 0

    def test_add_points_creates_score_row_and_log(self, db):
        user_id = 103
        _mk_user_pair(db, user_id)
        team = Team(id=3, name="TEAM-3", icon=None, is_active=True)
        db.add(team)
        db.commit()

        season = _mk_active_season(db, season_id=2)

        svc = V2TeamBattleService()
        result = svc.add_points(
            db,
            team_id=team.id,
            delta=7,
            action="ADMIN_ADJUST",
            user_id=user_id,
            season_id=season.id,
            meta={"reason": "test"},
            enforce_usage=False,
        )

        assert int(result["team_points"]) == 7
        assert int(result["applied_delta"]) == 7

        score = db.get(TeamScore, (team.id, season.id))
        assert score is not None
        assert int(score.points) == 7

        assert (
            db.query(TeamEventLog)
            .filter(TeamEventLog.team_id == team.id, TeamEventLog.season_id == season.id)
            .count()
            == 1
        )
