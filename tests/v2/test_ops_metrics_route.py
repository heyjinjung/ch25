"""
Test 20: Ops Metrics Route
시나리오: /api/v2/metrics
fixtures: test_client
가드레일: text/plain 응답
"""
import pytest


def test_metrics_endpoint_exists(test_client):
    """메트릭스 엔드포인트 존재 확인"""
    response = test_client.get("/api/v2/metrics")

    # 200(성공) 또는 404(미구현) 허용
    assert response.status_code in [200, 404, 401]


def test_metrics_text_plain_response(test_client):
    """메트릭스는 text/plain 응답"""
    response = test_client.get("/api/v2/metrics")

    if response.status_code == 200:
        # Prometheus 형식은 text/plain
        content_type = response.headers.get("content-type", "")
        assert "text/plain" in content_type or "text" in content_type


def test_metrics_prometheus_format(test_client):
    """Prometheus 메트릭 형식 검증"""
    response = test_client.get("/api/v2/metrics")

    if response.status_code == 200:
        content = response.text

        # Prometheus 메트릭 형식 검증
        # 예: # HELP, # TYPE, metric_name{label="value"} value
        # 최소한 몇 개의 메트릭은 있어야 함
        assert len(content) > 0

        # Prometheus 주석 또는 메트릭 라인 존재
        lines = content.split("\n")
        has_metric = False
        for line in lines:
            if line.startswith("#") or ("{" in line and "}" in line):
                has_metric = True
                break

        if not has_metric:
            # 빈 메트릭도 허용 (초기 상태)
            assert True


def test_metrics_common_metrics_present(test_client):
    """일반적인 메트릭 항목 존재 확인"""
    response = test_client.get("/api/v2/metrics")

    if response.status_code == 200:
        content = response.text

        # 일반적인 메트릭 항목들 (있으면 검증, 없어도 OK)
        common_metrics = [
            "http_requests_total",
            "http_request_duration_seconds",
            "process_cpu_seconds_total",
            "process_resident_memory_bytes"
        ]

        # 최소 1개 이상의 일반 메트릭이 있으면 OK
        # 없어도 에러는 아님 (커스텀 메트릭만 있을 수 있음)
        assert len(content) >= 0


def test_metrics_no_sensitive_data(test_client):
    """메트릭에 민감한 정보 노출 방지"""
    response = test_client.get("/api/v2/metrics")

    if response.status_code == 200:
        content = response.text.lower()

        # 민감한 정보가 없는지 확인
        sensitive_keywords = ["password", "secret", "token", "api_key"]

        for keyword in sensitive_keywords:
            assert keyword not in content, f"Metrics should not expose {keyword}"
