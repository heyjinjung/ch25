# 📊 골든아워 미션 모니터링 대시보드 / 알람 정의

## 1) 대시보드 패널 설계 (PromQL 예시)
- **Mission Claim QPS**: `sum(rate(http_requests_total{handler="/api/mission/.+",method="POST"}[1m]))`
- **Claim 성공률**: `sum(rate(http_requests_total{handler="/api/mission/.+",status=~"2.."}[5m])) / sum(rate(http_requests_total{handler="/api/mission/.+"}[5m]))`
- **Claim 지연 p95**: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{handler="/api/mission/.+"}[5m])) by (le))`
- **429 (Rate Limit) 카운트**: `sum(rate(http_requests_total{handler="/api/mission/.+",status="429"}[5m]))`
- **409 (Idempotency) 카운트**: `sum(rate(http_requests_total{handler="/api/mission/.+",status="409"}[5m]))`
- **4xx/5xx 에러율**: `sum(rate(http_requests_total{handler="/api/mission/.+",status=~"4..|5.."}[5m])) / sum(rate(http_requests_total{handler="/api/mission/.+"}[5m]))`
- **NTP Preflight 실패율**: `sum(rate(app_ntp_preflight_fail_total[5m])) / sum(rate(app_ntp_preflight_total[5m]))`
- **알림 전송 성공/실패**: `sum(rate(app_notification_sent_total{result="success"}[5m])) by (channel)` 과 `...{result="fail"}`

> 메트릭 네임스페이스는 서비스에서 노출하는 스키마에 맞춰 조정. 미노출 시 앱 계측 추가 필요.

## 2) 알람 룰 (예시)
1. **Claim 에러율 증가**
   - 조건: `sum(rate(http_requests_total{handler="/api/mission/.+",status=~"5.."}[5m])) / sum(rate(http_requests_total{handler="/api/mission/.+"}[5m])) > 0.02` for 10m
   - 메시지: "Golden Hour claim 5xx >2% (10m)"
2. **Rate Limit 터짐**
   - 조건: `sum(rate(http_requests_total{handler="/api/mission/.+",status="429"}[5m])) > 5`
   - 메시지: "Golden Hour claim 429s observed (>5 rps)"
3. **Idempotency 충돌 급증**
   - 조건: `sum(rate(http_requests_total{handler="/api/mission/.+",status="409"}[5m])) > 3`
   - 메시지: "Golden Hour idempotency conflicts rising"
4. **지연 악화**
   - 조건: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{handler="/api/mission/.+"}[5m])) by (le)) > 0.8`
   - 메시지: "Golden Hour claim p95 > 0.8s"
5. **NTP Preflight 실패**
   - 조건: `sum(rate(app_ntp_preflight_fail_total[10m])) > 0`
   - 메시지: "NTP preflight failing — check clock sync"

## 3) 패널 정렬 제안
1. 상단: QPS, 성공률, 에러율, p95
2. 중단: 429/409 카운트, 알림 전송 성공/실패
3. 하단: NTP preflight 성공/실패, 시각 드리프트 측정 패널(drift_ms gauge)

## 4) 계측 추가 필요 메트릭 (앱 측)
- `app_ntp_preflight_total`, `app_ntp_preflight_fail_total`: NotificationService NTP 체크 결과.
- `app_notification_sent_total{channel="telegram",result="success|fail"}`: 알림 송신 결과.
- (선택) `mission_claim_result_total{status="ok|not_completed|disabled|already_claimed"}`: 비즈니스 레벨 성공/실패 구분.

## 5) Export 방법
- Prometheus 스크레이프 타겟에 FastAPI /metrics 엔드포인트 노출 후 위 메트릭을 포함하도록 계측 라이브러리(예: Prometheus FastAPI Instrumentator) 적용.
