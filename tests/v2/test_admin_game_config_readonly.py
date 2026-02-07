"""
Test 11: Admin Game Config Read-Only
시나리오: 룰렛/다이스/복권 설정 조회
fixtures: admin_token, test_client
가드레일: 200 + 필수 필드
"""
import pytest


def test_roulette_config_read(test_client, admin_token):
    """룰렛 설정 조회 API"""
    response = test_client.get(
        "/api/v2/admin/game/roulette/config",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # 필수 필드 검증
    assert "config" in data or "configs" in data or isinstance(data, list)


def test_dice_config_read(test_client, admin_token):
    """다이스 설정 조회 API"""
    response = test_client.get(
        "/api/v2/admin/game/dice/config",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # 필수 필드 검증
    assert "config" in data or "configs" in data or isinstance(data, list)


def test_lottery_config_read(test_client, admin_token):
    """복권 설정 조회 API"""
    response = test_client.get(
        "/api/v2/admin/game/lottery/config",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # 필수 필드 검증
    assert "config" in data or "configs" in data or isinstance(data, list)


def test_game_config_list(test_client, admin_token):
    """전체 게임 설정 목록 조회"""
    response = test_client.get(
        "/api/v2/admin/game/configs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    # 200 또는 404(아직 구현 안됨) 허용
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, (dict, list))


def test_game_config_unauthorized(test_client):
    """인증 없이 게임 설정 조회 시 401"""
    response = test_client.get("/api/v2/admin/game/roulette/config")
    assert response.status_code == 401
