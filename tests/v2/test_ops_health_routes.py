"""
Test 19: Ops Health Routes
시나리오: /health, /api/v2/health, /api/v2/health/db
fixtures: test_client
가드레일: 200 + status ok
"""
import pytest


def test_health_root_endpoint(test_client):
    """루트 헬스 체크 엔드포인트"""
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["ok", "healthy", "UP"]


def test_health_v2_endpoint(test_client):
    """V2 헬스 체크 엔드포인트"""
    response = test_client.get("/api/v2/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["ok", "healthy", "UP"]


def test_health_db_endpoint(test_client):
    """DB 헬스 체크 엔드포인트"""
    response = test_client.get("/api/v2/health/db")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data or "db_status" in data
    # DB 연결 상태 확인
    if "status" in data:
        assert data["status"] in ["ok", "healthy", "UP"]


def test_health_endpoints_no_auth_required(test_client):
    """헬스 체크는 인증 불필요"""
    # 인증 토큰 없이 호출
    endpoints = ["/health", "/api/v2/health", "/api/v2/health/db"]

    for endpoint in endpoints:
        response = test_client.get(endpoint)
        # 401이 아닌 200이어야 함
        assert response.status_code == 200


def test_health_response_format(test_client):
    """헬스 체크 응답 형식 검증"""
    response = test_client.get("/api/v2/health")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")

    data = response.json()
    assert isinstance(data, dict)
    assert "status" in data


def test_health_db_connection_check(test_client):
    """DB 연결 상태 확인"""
    response = test_client.get("/api/v2/health/db")
    assert response.status_code == 200

    data = response.json()
    # DB가 정상 연결되었는지 확인
    if "db_status" in data:
        assert data["db_status"] in ["connected", "ok", "healthy"]
    elif "status" in data:
        assert data["status"] in ["ok", "healthy", "UP"]
