def test_public_ui_copy_ticket0_fallback_defaults(client):
    resp = client.get("/api/ui-copy/ticket0")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["title"], str)
    assert isinstance(data["body"], str)
    assert isinstance(data["primary_cta_label"], str)
    assert isinstance(data["secondary_cta_label"], str)


def test_admin_ui_copy_ticket0_upsert_and_public_read(client):
    payload = {
        "title": "오늘 해결 가이드",
        "body": "운영에서 매일 바꿀 수 있는 문구입니다.",
        "primary_cta_label": "충전하러 가기",
        "secondary_cta_label": "문의하기",
    }

    put = client.put("/api/admin/ui-copy/ticket0", json=payload)
    assert put.status_code == 200
    assert put.json()["primary_cta_label"] == "충전하러 가기"

    public = client.get("/api/ui-copy/ticket0")
    assert public.status_code == 200
    data = public.json()
    assert data["title"] == "오늘 해결 가이드"
    assert data["secondary_cta_label"] == "문의하기"
