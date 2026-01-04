from prometheus_client import Counter, Histogram

# Mission claim metrics
mission_claim_result_total = Counter(
    "mission_claim_result_total",
    "Mission claim attempts by business status and HTTP status",
    labelnames=["status", "http_status"],
)
mission_claim_latency_seconds = Histogram(
    "mission_claim_latency_seconds",
    "Latency for mission claim handler",
    buckets=(0.05, 0.1, 0.2, 0.5, 0.8, 1.0, 2.0, 5.0),
)

# NTP preflight metrics
ntp_preflight_total = Counter(
    "app_ntp_preflight_total",
    "Count of NTP/time preflight attempts",
    labelnames=["provider"],
)
ntp_preflight_fail_total = Counter(
    "app_ntp_preflight_fail_total",
    "Count of NTP/time preflight failures",
    labelnames=["provider"],
)
ntp_preflight_drift_ms = Histogram(
    "app_ntp_preflight_drift_ms",
    "Observed time drift in milliseconds",
    buckets=(50, 100, 200, 500, 1000, 2000, 5000),
)

# Notification delivery metrics
notification_sent_total = Counter(
    "app_notification_sent_total",
    "Notification send outcomes",
    labelnames=["channel", "result"],
)
