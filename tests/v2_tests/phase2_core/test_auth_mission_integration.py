import os
os.environ["ENV"] = "dev"

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


# 통합 엣지케이스: 인증 성공 후 미션 API 정상 접근
def test_auth_then_mission_success():
    # 1. DEV 환경 로그인 (테스트용)
    login_res = client.post(
        "/api/v2/dev/login",
        json={"cc_id": "testuser1", "create_if_missing": True},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    # 2. 토큰으로 미션 API 접근 (실제 엔드포인트: /api/v2/mission/{mission_id}/claim)
    mission_res = client.post(
        "/api/v2/mission/1/claim",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Idempotency-Key": "testcase-1"
        },
    )
    assert mission_res.status_code in (200, 400)  # 성공 또는 미션 조건 미충족


# 엣지: 만료/변조 토큰으로 미션 접근 차단
def test_mission_with_expired_token():
    expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxMDAwLCJleHAiOjEwMDAwLCJyb2xlIjoiUSERIn0.fakeexpiredsig"
    res = client.post(
        "/api/v2/mission/1/claim",
        headers={
            "Authorization": f"Bearer {expired_token}",
            "X-Idempotency-Key": "testcase-2"
        },
    )
    assert res.status_code == 401


# 엣지: 인증 없이 미션 접근 차단
def test_mission_without_token():
    res = client.post(
        "/api/v2/mission/1/claim",
        headers={"X-Idempotency-Key": "testcase-3"}
    )
    assert res.status_code in (400, 401)

# 트러블: user.id vs v2_user.id mismatch 시 미션/인증 연동 실패
def test_dev_login_user_not_found():
    # create_if_missing=False 기본 동작: 유저 없으면 404
    login_res = client.post("/api/v2/dev/login", json={"cc_id": "ghostuser"})
    assert login_res.status_code == 404

# 트러블: 이벤트 로그 누락/DB constraint 위반 시 예외 발생
def test_dev_login_missing_cc_id():
    login_res = client.post("/api/v2/dev/login", json={"cc_id": "   "})
    assert login_res.status_code == 400
