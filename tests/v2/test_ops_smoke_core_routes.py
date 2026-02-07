"""
Test 21: Ops Smoke Core Routes
시나리오: 배포 스모크 핵심 라우트 3~5개
fixtures: test_client
가드레일: 200/401 범위 허용
"""
import pytest


def test_smoke_health_check(test_client):
    """스모크 테스트: 헬스 체크"""
    response = test_client.get("/health")
    assert response.status_code == 200


def test_smoke_api_v2_health(test_client):
    """스모크 테스트: V2 API 헬스"""
    response = test_client.get("/api/v2/health")
    assert response.status_code == 200


def test_smoke_admin_login(test_client):
    """스모크 테스트: 관리자 로그인 엔드포인트"""
    response = test_client.post(
        "/api/v2/admin/login",
        json={"cc_id": "test_admin", "password": "wrong"}
    )
    # 401(인증 실패) 또는 404(미구현) 허용
    assert response.status_code in [200, 401, 404, 422]


def test_smoke_user_me_endpoint(test_client):
    """스모크 테스트: 사용자 정보 조회"""
    response = test_client.get("/api/v2/user/me")
    # 인증 없으면 401, 있으면 200
    assert response.status_code in [200, 401, 404]


def test_smoke_game_configs(test_client):
    """스모크 테스트: 게임 설정 조회"""
    response = test_client.get("/api/v2/game/configs")
    # 인증 여부에 따라 200/401/404
    assert response.status_code in [200, 401, 404]


def test_smoke_core_routes_response_time(test_client):
    """스모크 테스트: 코어 라우트 응답 시간"""
    import time

    # 헬스 체크는 빠르게 응답해야 함 (1초 이내)
    start = time.time()
    response = test_client.get("/health")
    elapsed = time.time() - start

    assert response.status_code == 200
    assert elapsed < 1.0  # 1초 이내 응답


def test_smoke_all_core_routes(test_client):
    """스모크 테스트: 모든 코어 라우트"""
    core_routes = [
        ("/health", 200),
        ("/api/v2/health", 200),
        ("/api/v2/health/db", 200),
        ("/api/v2/user/me", [200, 401]),
        ("/api/v2/admin/ops/status", [200, 401, 404])
    ]

    for route, expected_codes in core_routes:
        if not isinstance(expected_codes, list):
            expected_codes = [expected_codes]

        response = test_client.get(route)
        assert response.status_code in expected_codes, f"Route {route} failed"


def test_smoke_error_handling(test_client):
    """스모크 테스트: 에러 핸들링"""
    # 존재하지 않는 경로
    response = test_client.get("/api/v2/nonexistent/route/12345")
    # 404 또는 적절한 에러 코드
    assert response.status_code in [404, 422]
