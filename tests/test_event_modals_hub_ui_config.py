from fastapi.testclient import TestClient


def test_event_modals_hub_ui_config_roundtrip(client: TestClient) -> None:
    payload = {
        "value": {
            "version": 1,
            "title": "Event Hub Title",
            "subtitle": "Test subtitle",
            "kicker": "Event Hub",
            "note": "Cards open modals.",
            "sections": [
                {"id": "active", "title": "Active", "subtitle": "Test", "order": 0, "enabled": True},
            ],
            "cards": [
                {
                    "key": "streak",
                    "title": "Streak",
                    "description": "Test card",
                    "sectionId": "active",
                    "order": 0,
                    "enabled": True,
                }
            ],
        }
    }

    upsert = client.put("/admin/api/ui-config/event_modals_hub", json=payload)
    assert upsert.status_code == 200
    assert upsert.json()["key"] == "event_modals_hub"

    admin_get = client.get("/admin/api/ui-config/event_modals_hub")
    assert admin_get.status_code == 200
    admin_value = admin_get.json()["value"]
    assert admin_value["subtitle"] == "Test subtitle"

    public_get = client.get("/api/ui-config/event_modals_hub")
    assert public_get.status_code == 200
    public_value = public_get.json()["value"]
    assert public_value["title"] == "Event Hub Title"
