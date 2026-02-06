# V2 배포 후 액션 아이템 (Post-Deployment Action Items)

**작성일**: 2026-01-30
**우선순위**: High → Low

---

## 🔴 High Priority (즉시 조치 필요)

### 1. Sentry 연동 ⚠️
- **현재 상태**: `SENTRY_DSN: NOT SET`
- **영향**: 프로덕션 에러 추적 불가
- **조치**:
  ```bash
  # 1. Sentry 프로젝트 생성 (https://sentry.io)
  # 2. DSN 발급
  # 3. .env에 추가
  SENTRY_DSN=https://your-dsn@sentry.io/project-id

  # 4. requirements.txt에서 주석 제거
  sentry-sdk==1.39.2

  # 5. 재배포
  docker-compose down && docker-compose up -d --build
  ```


### 3. Telegram Auth Rate Limit 적용 🛡️
- **현재 상태**: Rate Limiter 모듈 구현됨, 엔드포인트 미적용
- **영향**: DDoS 공격 취약
- **조치**:
  ```python
  # app/v2/api/telegram_routes.py 수정
  from app.utils.rate_limit import rate_limiter

  @router.post("/auth")
  def v2_telegram_auth(...):
      # Rate limit: 10 req/sec per IP
      key = f"telegram_auth:{client_ip}"
      if not rate_limiter.allow(key, limit=10, burst=20):
          raise HTTPException(429, "TOO_MANY_REQUESTS")
      ...
  ```

---

## 🟡 Medium Priority (단기 개선)

### 4. Grafana 대시보드 구축 📊
- **현재 상태**: Prometheus 메트릭 준비 완료, 대시보드 미설정
- **조치**:
  ```bash
  # 1. Prometheus 설정
  # prometheus.yml 생성

  # 2. Grafana 설치
  docker run -d -p 3001:3000 grafana/grafana

  # 3. 대시보드 import
  # - API 응답 시간
  # - DB 쿼리 성능
  # - Circuit Breaker 발동 횟수
  ```

### 5. Application-level 캐싱 🚀
- **현재 상태**: Redis 연결만 완료, 애플리케이션 캐시 미사용
- **영향**: DB 부하 증가
- **조치**:
  ```python
  # 예시: 게임 설정 캐싱
  from functools import lru_cache

  @lru_cache(maxsize=128)
  def get_game_config(game_type: str):
      return db.query(GameConfig).filter(...).first()
  ```

### 6. N+1 쿼리 최적화 🔧
- **조치**:
  ```python
  # Admin API 수정 예시
  users = db.query(V2User).options(
      selectinload(V2User.auth_events),
      joinedload(V2User.admin_profile)
  ).all()
  ```

---

## 🟢 Low Priority (장기 개선)

### 7. 중앙 집중식 로그 수집 📝
- **현재**: Docker logs 사용
- **권장**: ELK Stack 또는 CloudWatch
- **조치**: 별도 인프라 구축 프로젝트

### 8. DB Connection Pool 튜닝 ⚙️
- **조치**:
  ```python
  # app/db/session.py
  SQLALCHEMY_POOL_SIZE=20
  SQLALCHEMY_MAX_OVERFLOW=40
  SQLALCHEMY_POOL_TIMEOUT=30
  SQLALCHEMY_POOL_RECYCLE=3600
  ```

---

## ✅ 완료된 항목

- [x] V2User password_hash 추가 (2026-01-30)
- [x] Celery Worker/Beat healthcheck (2026-01-30)
- [x] Telegram Auth hash 검증 (hmac.compare_digest)
- [x] DEV 로그인 차단 (프로덕션)
- [x] Auth Event 로깅
- [x] Pydantic 입력 검증 (57개 스키마)
- [x] SQLAlchemy ORM 사용
- [x] Celery 스케줄 작업 설정
- [x] Redis 연결

---

**다음 리뷰**: 2026-02-07 (1주일 후)
**담당자**: DevOps Team
