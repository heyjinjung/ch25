def test_crm_stats(client):
    response = client.get("/admin/api/crm/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "conversion_rate" in data


def test_segment_detail(client):
    segments = ["TOTAL_USERS", "PAYING_USERS", "WHALE", "EMPTY_TANK", "DORMANT"]
    for segment in segments:
        response = client.get(f"/admin/api/crm/segment-detail?segment_type={segment}")
        assert response.status_code == 200
        users = response.json()
        if users:
            user = users[0]
            assert "user_id" in user
            assert "external_id" in user
            assert "computed_segments" in user
