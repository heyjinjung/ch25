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

### ✅ 결과
- 설정 변경 후 백엔드 재시작 (`docker compose restart backend`)
- 미션 수령 시 429 에러 없이 정상 처리됨을 확인.

---
**작성일**: 2026-01-08  
**상태**: 해결 완료 (Resolved)
