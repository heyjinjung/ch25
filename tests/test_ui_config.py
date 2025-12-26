def test_public_ui_config_default_when_missing(client):
    resp = client.get("/api/ui-config/ticket_zero")
    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "ticket_zero"
    assert data["value"] is None


def test_admin_ui_config_upsert_and_public_read(client):
    payload = {
        "value": {
            "title": "티켓이 없어요",
            "body": "오늘은 이렇게 해결하세요",
            "cta_label": "무료 충전소",
            "cta_url": "https://example.com/fill",
        }
    }
    put = client.put("/admin/api/ui-config/ticket_zero", json=payload)
    assert put.status_code == 200

    public = client.get("/api/ui-config/ticket_zero")
    assert public.status_code == 200
    data = public.json()
    assert data["key"] == "ticket_zero"
    assert isinstance(data["value"], dict)
    assert data["value"]["cta_label"] == "무료 충전소"
