# 개발 로그 - 2026-01-08

## 이슈: 웰컴/데일리 미션 수령 시 Rate Limit 오류

### 🐛 문제 현황
- **증상**: 신규 웰컴 미션 또는 데일리 미션 수령(`POST /api/mission/{id}/claim`) 시도 시 `429 Too Many Requests` 에러 발생.
- **에러 메시지**: `AxiosError: Request failed with status code 429`
- **원인 분석**:
    - `app/api/routes/mission.py` 내 `claim_mission_reward` 함수에 적용된 Rate Limiter가 동작.
    - 로컬 개발 환경에서의 테스트 중 짧은 시간 내 여러 요청이나 재시도 등으로 인해 제한(`10 RPS`, `Burst 20`)에 걸림.
    - `redis-cli` 확인 결과 키가 없었으나, 설정 자체가 타이트함.

### 🛠️ 해결 방안 (로컬 환경)

#### Docker Compose 환경 변수 설정 추가
`docker-compose.yml`의 `backend` 서비스 환경 변수에 Rate Limit 설정값을 높여서 로컬 테스트가 원활하도록 조치함.

**변경 파일**: `docker-compose.yml`

```yaml
services:
  backend:
    environment:
      # ... 기존 설정 ...
      # Rate Limiting (높은 값으로 설정하여 로컬 테스트 방해 방지)
      GOLDEN_HOUR_CLAIM_RATE_RPS: "1000"
      GOLDEN_HOUR_CLAIM_RATE_BURST: "2000"
```

### 🚨 추가 이슈 발생 (Production)
- **증상**: 로컬 픽스 적용 후에도 운영 서버(cc-jm.com)에서 `429 Too Many Requests` 및 `409 Conflict` 오류 지속.
- **심층 원인**: 
    1. **Rate Limit (429)**: 운영 환경은 Nginx 프록시 뒤에 Docker 컨테이너가 위치함. 백엔드가 `X-Forwarded-For` 헤더를 신뢰하도록 설정되지 않아, 모든 요청의 클라이언트 IP가 Nginx 내부 IP로 인식됨. 결과적으로 **모든 유저가 하나의 Rate Limit(20 RPS)을 공유**하는 치명적 병목 발생.
    2. **Idempotency Conflict (409)**: 429 에러 해결 과정에서 클라이언트(브라우저)가 이전에 생성한 `Idempotency Key`를 재사용하여 재요청을 보냄. 백엔드는 이를 중복 요청으로 판단하여 거부.

### 🛠️ 최종 해결 방안 (Infrastructure Fix)

#### 1. ProxyHeadersMiddleware 적용 (Root Cause Fix)
백엔드(`main.py`)에 `ProxyHeadersMiddleware`를 추가하여 Nginx가 전달하는 `X-Forwarded-For` 헤더를 신뢰하도록 설정. 이를 통해 백엔드가 실제 클라이언트 IP를 식별할 수 있게 됨.

**변경 파일**: `app/main.py`
```python
# [INFRA FIX] Trust X-Forwarded-For headers from Nginx (Docker internal IP)
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
```

#### 2. 보안 기능 재활성화
일시적으로 비활성화(Hotfix)했던 Rate Limit 및 Idempotency Check 기능을 다시 활성화함. (인프라 수정으로 인해 이제 정상 작동함)

### ✅ 최종 결과
- 백엔드 재시작 후 실제 클라이언트 IP가 로그에 정상적으로 기록됨.
- Rate Limit이 유저별로 정상 적용되어 429 에러 해소.
- 409 에러는 유저 측 새로고침(새 키 생성) 안내 및 기능 정상화로 해결.

---
**작성일**: 2026-01-08  
**상태**: 해결 완료 (Resolved)
