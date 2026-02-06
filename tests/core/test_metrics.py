"""
Unit tests for app/core/metrics.py
"""
import pytest
from app.core import metrics

def test_metrics_instantiation():
    """Verify metrics objects are instantiated correctly."""
    assert metrics.mission_claim_result_total._labelnames == ("status", "http_status")
    assert metrics.mission_claim_latency_seconds._labelnames == ()  # No labels
    
    assert metrics.ntp_preflight_total._labelnames == ("provider",)
    assert metrics.ntp_preflight_fail_total._labelnames == ("provider",)
    assert metrics.ntp_preflight_drift_ms._labelnames == () # No labels
    
    assert metrics.notification_sent_total._labelnames == ("channel", "result")

def test_metrics_increment():
    """Verify metrics can be incremented (basic sanity)."""
    # Note: mocking prometheus internals is complex, here we just verify the API surface works.
    metrics.mission_claim_result_total.labels(status="success", http_status="200").inc()
    metrics.ntp_preflight_total.labels(provider="google").inc()
    metrics.notification_sent_total.labels(channel="telegram", result="ok").inc()
    
    # Histogram observe
    metrics.mission_claim_latency_seconds.observe(0.1)
    metrics.ntp_preflight_drift_ms.observe(100)
