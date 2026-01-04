from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.feature import UserEventLog


def test_admin_dashboard_streak_metrics_aggregates_user_event_log(client, session_factory):
    db: Session = session_factory()

    now = datetime.utcnow()
    kst_offset = timedelta(hours=9)
    today_kst = (now + kst_offset).date()
    yesterday_kst = ((now - timedelta(days=1)) + kst_offset).date()

    # Seed event logs across two UTC days.
    db.add(
        UserEventLog(
            user_id=1,
            feature_type="STREAK",
            event_name="streak.promote",
            meta_json={"milestone": "HOT"},
            created_at=now - timedelta(days=1, hours=1),
        )
    )
    db.add(
        UserEventLog(
            user_id=1,
            feature_type="STREAK",
            event_name="streak.promote",
            meta_json={"milestone": "HOT"},
            created_at=now - timedelta(days=1, hours=2),
        )
    )
    db.add(
        UserEventLog(
            user_id=1,
            feature_type="STREAK",
            event_name="streak.reset",
            meta_json={"prev_streak_days": 3},
            created_at=now,
        )
    )
    db.commit()

    resp = client.get("/admin/api/dashboard/streak", params={"days": 2})
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["days"] == 2
    assert isinstance(payload.get("timezone"), str)
    assert isinstance(payload.get("calendar_bucket"), str)
    assert isinstance(payload.get("operational_reset_hour_kst"), int)
    assert payload.get("streak_trigger") in ("PLAY_GAME", None)
    assert isinstance(payload.get("notes"), list)
    assert isinstance(payload.get("items"), list)
    assert len(payload["items"]) == 2

    items_by_day = {row["day"]: row for row in payload["items"]}

    assert str(yesterday_kst) in items_by_day
    assert str(today_kst) in items_by_day

    assert items_by_day[str(yesterday_kst)]["promote"] == 2
    assert items_by_day[str(yesterday_kst)]["reset"] == 0

    assert items_by_day[str(today_kst)]["promote"] == 0
    assert items_by_day[str(today_kst)]["reset"] == 1
