# V2 Production Deployment Checklist (배포 전 체크리스트)

**문서 타입**: 배포 가이드 (Deployment Guide)
**작성일**: 2026-01-29
**대상**: DevOps, Backend 팀
**프로젝트**: Golden V2

---

## 1. 데이터베이스 마이그레이션 (Database Migration)

### 1.1 Alembic Migration 준비 ✅
- [x] **모든 마이그레이션** 파일 검토
  ```bash
  alembic history
  alembic current
  ```
- [x] **마이그레이션 dry-run 테스트** (SQL Preview 생성 및 검증)
  ```bash
  alembic upgrade ce5b8baf8510:head --sql > migration_preview.sql
  # SQL 검토 완료
  alembic upgrade head
  ```
- [x] **롤백 스크립트** 준비 (`alembic downgrade -1` 테스트 완료)

### 1.2 필수 마이그레이션 목록 ✅
- [x] `20260128_1800_add_v2_auth_tables.py` - V2 Auth 테이블
- [x] V2 Golden Intervention 관련 테이블 (`20260124_1200`, `20260129_1713`)
- [x] V2 ROI 로그 테이블 (`20260119_1700`)

### 1.3 인덱스 추가 확인
- [ ] `v2_user.telegram_id` 인덱스
- [ ] `v2_user_auth_event.user_id, created_at` 복합 인덱스
- [ ] `v2_user_refresh_token.jti` 유니크 인덱스
- [ ] `v2_retention_roi_log.event_type, created_at` 복합 인덱스

---

## 2. 환경 변수 설정 (Environment Variables)

### 2.1 필수 환경 변수
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# JWT
JWT_SECRET=<강력한 시크릿 키>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440  # V1 호환
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15  # V2 전용

# Telegram
TELEGRAM_BOT_TOKEN=<프로덕션 봇 토큰>

# Environment
ENV=production

# V2 Features
DEV_LOGIN_ENABLED=false  # ⚠️ 프로덕션에서는 반드시 false
TEST_MODE=false

# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Redis (Circuit Breaker, Celery)
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=<Sentry DSN>

# Timezone
TIMEZONE=Asia/Seoul
```

### 2.2 보안 체크
- [ ] JWT_SECRET이 강력한가? (최소 32자 이상)
- [ ] DEV_LOGIN_ENABLED=false 확인
- [ ] TEST_MODE=false 확인
- [ ] DATABASE_URL에 실제 프로덕션 DB 연결 정보
- [ ] CORS_ORIGINS에 허용된 도메인만 포함

---

## 3. 코드 품질 & 테스트 (Code Quality & Testing)

### 3.1 유닛 테스트 실행
```bash
# 전체 테스트 실행
pytest tests/ -v

# V2 테스트만 실행
pytest tests/v2/ -v

# 커버리지 확인
pytest --cov=app --cov-report=html
```

### 3.2 필수 테스트 통과 확인
- [ ] `tests/v2/test_telegram_auth.py` - 14/14 통과
- [ ] `tests/v2/test_admin_rbac.py` - RBAC 테스트
- [ ] `tests/v2/test_admin_api.py` - Admin API 테스트
- [ ] `tests/v2/test_daily_nudge_service.py` - Daily Nudge 테스트
- [ ] `tests/v2/test_roi_rollback_service.py` - ROI & Rollback 테스트

### 3.3 Lint & Format
```bash
# Ruff (또는 Flake8)
ruff check app/

# Black (또는 선호하는 formatter)
black app/ --check

# Type check (mypy)
mypy app/
```

---

## 4. 보안 체크 (Security Checklist)

### 4.1 인증 & 권한
- [ ] **Telegram hash 검증** 활성화 (`app/v2/core/telegram.py`)
- [ ] **RBAC 로깅** 활성화 (`app/api/deps.py` - RBAC_DENIED 이벤트)
- [ ] **Admin API 권한** 확인 (ADMIN, SUPER_ADMIN만 접근)
- [ ] **DEV 로그인** 비활성화 (`DEV_LOGIN_ENABLED=false`)

### 4.2 Rate Limiting
- [ ] API Rate Limiting 설정 (예: FastAPI Limiter)
- [ ] Telegram Auth 엔드포인트에 Rate Limit 적용 (DDoS 방지)

### 4.3 SQL Injection & XSS
- [ ] SQLAlchemy ORM 사용 확인 (raw SQL 최소화)
- [ ] 사용자 입력 검증 (Pydantic 스키마)

---

## 5. Circuit Breaker & 운영 안전장치

### 5.1 Circuit Breaker 설정 ✅
- [x] Redis 연결 확인 (`redis-cli ping`)
- [x] Circuit Breaker 임계값 설정
  ```python
  CIRCUIT_LIMIT_VAULT=1000000  # 시간당 100만원
  CIRCUIT_LIMIT_TICKET=500     # 시간당 500장
  ```
- [x] Slack/Telegram Alert 설정 (Mocked/Ready)

### 5.2 모니터링
- [ ] **Sentry** 연동 (에러 추적)
- [ ] **Grafana/Prometheus** 메트릭 수집
  - API 응답 시간
  - DB 쿼리 성능
  - Circuit Breaker 발동 횟수
- [ ] **로그 집계** (ELK Stack 또는 CloudWatch)

---

## 6. Celery & 스케줄러 (Background Tasks)

### 6.1 Celery Worker 실행
```bash
# Celery Worker 시작
celery -A app.worker.celery_app worker --loglevel=info

# Celery Beat 시작 (스케줄러)
celery -A app.worker.celery_app beat --loglevel=info
```

### 6.2 스케줄 작업 확인
- [ ] **Daily Nudge**: 매일 12:00, 18:00 KST
- [ ] **ROI Calculator**: 매일 00:00 KST (어제 데이터 집계)
- [ ] **Segment Batch**: 매일 01:00 KST

### 6.3 Redis 연결 확인
```bash
redis-cli ping
# PONG 응답 확인
```

---

## 7. 성능 최적화 (Performance Optimization)

### 7.1 DB 쿼리 최적화
- [ ] **N+1 쿼리 제거** (selectinload, joinedload 사용)
- [ ] **인덱스 최적화** (자주 조회하는 컬럼)
- [ ] **Pagination 적용** (대량 데이터 조회)

### 7.2 캐싱
- [ ] **Redis 캐싱** 적용 (자주 조회하는 데이터)
  - 유저 정보
  - 게임 설정
  - 상점 상품 목록
- [ ] **캐시 무효화 전략** 확인

### 7.3 Connection Pool
```python
# SQLAlchemy Connection Pool 설정
SQLALCHEMY_POOL_SIZE=20
SQLALCHEMY_MAX_OVERFLOW=40
SQLALCHEMY_POOL_TIMEOUT=30
SQLALCHEMY_POOL_RECYCLE=3600
```

---

## 8. 배포 시나리오 (Deployment Scenarios)

### 8.1 Blue-Green Deployment (권장)
1. **Green 환경** (신규 V2)에 배포
2. Health Check 확인
3. 트래픽 일부 전환 (10% → 50% → 100%)
4. 모니터링 (에러율, 응답시간)
5. 문제 발생 시 Blue 환경 (기존)으로 즉시 롤백

### 8.2 Rolling Deployment
1. 서버 1대씩 순차 배포
2. 각 서버 배포 후 Health Check
3. 문제 발생 시 롤백

### 8.3 Canary Deployment
1. 1~5% 유저에게만 V2 노출
2. 1일간 모니터링
3. 문제 없으면 점진적 확대

---

## 9. 배포 후 확인 (Post-Deployment Verification)

### 9.1 Health Check
```bash
# API Health Check
curl https://api.yourdomain.com/health

# DB 연결 확인
curl https://api.yourdomain.com/api/v2/health/db
```

### 9.2 핵심 API 테스트
- [ ] `POST /api/v2/telegram/auth` - Telegram 로그인
- [ ] `POST /api/v2/auth/refresh` - Token 갱신
- [ ] `GET /api/v2/user/me` - 유저 정보 조회
- [ ] `POST /api/v2/dev/login` - DEV 로그인 (비활성화 확인 - 403)

### 9.3 Admin API 테스트
- [ ] `GET /api/v2/admin/users` - 유저 목록 (ADMIN 권한)
- [ ] `GET /api/v2/admin/daily-nudge/targets` - 넛지 대상자 조회
- [ ] `GET /api/v2/admin/roi/top-campaigns` - ROI 상위 캠페인

### 9.4 모니터링 확인
- [ ] Sentry에 에러 없는지 확인
- [ ] Grafana 대시보드에서 메트릭 확인
  - API 응답 시간 < 200ms (p95)
  - DB 쿼리 시간 < 100ms (p95)
  - 에러율 < 0.1%
- [ ] 로그 확인 (WARNING, ERROR 레벨)

---

## 10. 롤백 계획 (Rollback Plan)

### 10.1 즉시 롤백 조건
- [ ] 에러율 > 1%
- [ ] 응답 시간 > 1초 (p95)
- [ ] Circuit Breaker 과다 발동
- [ ] DB 마이그레이션 실패

### 10.2 롤백 절차
```bash
# 1. 코드 롤백 (이전 버전으로)
git checkout <previous-stable-tag>
docker build -t app:rollback .
docker-compose up -d

# 2. DB 롤백 (필요시)
alembic downgrade -1

# 3. 캐시 클리어
redis-cli FLUSHALL

# 4. Health Check
curl https://api.yourdomain.com/health
```

---

## 11. 문서화 (Documentation)

### 11.1 배포 문서 업데이트 ✅
- [x] API 문서 (Swagger/OpenAPI 최신화 확인)
- [x] 환경 변수 가이드 (`v2_server_deployment_guide_ko.md`)
- [x] 트러블슈팅 가이드 (`v2_deployment_troubleshooting_guide_ko.md`)

### 11.2 팀 공유
- [ ] 배포 노트 작성 (릴리즈 노트)
- [ ] 변경 사항 요약
- [ ] 주의사항 전달

---

## 12. 최종 체크리스트 (Final Checklist)

### Before Deployment
- [ ] 모든 테스트 통과
- [ ] Staging 환경에서 검증 완료
- [ ] DB 백업 완료
- [ ] 롤백 계획 수립

### During Deployment
- [ ] 배포 스크립트 실행
- [ ] DB 마이그레이션 실행
- [ ] Health Check 통과
- [ ] 모니터링 활성화

### After Deployment
- [ ] 핵심 API 테스트
- [ ] 에러 로그 확인
- [ ] 성능 메트릭 확인
- [ ] 팀 공지

---

## 13. 긴급 연락망 (Emergency Contacts)

| 역할 | 담당자 | 연락처 |
|------|--------|--------|
| DevOps Lead | - | - |
| Backend Lead | - | - |
| DBA | - | - |
| On-call Engineer | - | - |

---

## 14. 참고 문서 (References)

- **V2 Auth SoT**: `docs/v2_specs/00_sot_meta/v2_telegram_auth_sot_ko.md`
- **Trouble Mapping**: `docs/v2_specs/00_sot_meta/v2_auth_trouble_mapping_ko.md`
- **Golden V2 구현 가이드**: `docs/v2_specs/07_golden/2026_01_29_golden_v2_remaining_implementation_guide_ko.md`
- **Learned 문서**: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md`

---

## 15. 배포 스크립트 예시

### 15.1 Docker Compose
```yaml
version: '3.8'

services:
  api:
    image: your-registry/v2-api:latest
    environment:
      - ENV=production
      - DEV_LOGIN_ENABLED=false
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - REDIS_URL=${REDIS_URL}
      - SENTRY_DSN=${SENTRY_DSN}
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  celery-worker:
    image: your-registry/v2-api:latest
    command: celery -A app.worker.celery_app worker --loglevel=info
    environment:
      - ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}

  celery-beat:
    image: your-registry/v2-api:latest
    command: celery -A app.worker.celery_app beat --loglevel=info
    environment:
      - ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=v2_production
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 15.2 배포 스크립트
```bash
#!/bin/bash
set -e

echo "🚀 Starting V2 Production Deployment..."

# 1. 환경 변수 확인
if [ "$DEV_LOGIN_ENABLED" != "false" ]; then
    echo "❌ DEV_LOGIN_ENABLED must be false in production!"
    exit 1
fi

# 2. DB 백업
echo "📦 Backing up database..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Docker 이미지 빌드
echo "🔨 Building Docker image..."
docker build -t your-registry/v2-api:latest .

# 4. DB 마이그레이션
echo "🔄 Running database migrations..."
docker-compose run --rm api alembic upgrade head

# 5. 서비스 재시작
echo "🔄 Restarting services..."
docker-compose up -d

# 6. Health Check
echo "🏥 Running health check..."
sleep 10
curl -f http://localhost:8000/health || exit 1

echo "✅ Deployment completed successfully!"
```

---

**배포 전 반드시 모든 체크리스트를 확인하세요!**
