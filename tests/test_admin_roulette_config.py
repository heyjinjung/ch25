"""Admin roulette config update should not violate unique constraints.

Regression test: updating an existing config replaces segments (0~5) and must flush deletions
before inserting new segments to avoid uq_roulette_segment_slot errors.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.roulette import RouletteConfig, RouletteSegment


def _segments(config: RouletteConfig) -> list[RouletteSegment]:
    return [
        RouletteSegment(config=config, slot_index=i, label=f"S{i}", reward_type="POINT", reward_amount=1, weight=1)
        for i in range(6)
    ]


def test_admin_roulette_update_replaces_segments(client: TestClient, session_factory) -> None:
    session: Session = session_factory()

    cfg = RouletteConfig(name="CFG", is_active=True, max_daily_spins=0)
    session.add(cfg)
    session.flush()
    session.add_all(_segments(cfg))
    session.commit()
    session.close()

    # In tests, get_current_user_id is overridden to 1 so admin endpoints also pass.
    payload = {
        "name": "CFG_UPDATED",
        "is_active": True,
        "max_daily_spins": 0,
        "segments": [
            {
                "index": i,
                "label": f"N{i}",
                "weight": 1,
                "reward_type": "POINT",
                "reward_value": 2,
                "is_jackpot": False,
            }
            for i in range(6)
        ],
    }

    resp = client.put(f"/admin/api/roulette-config/{cfg.id}", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["name"] == "CFG_UPDATED"
    assert len(data["segments"]) == 6
    indexes = {
        int(s.get("index") if s.get("index") is not None else s.get("slot_index"))
        for s in data["segments"]
    }
    assert indexes == set(range(6))
