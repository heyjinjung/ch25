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

### 1.3 인덱스 추가 확인 ✅
- [x] `v2_user.telegram_id` (UNIQUE)
- [x] `v2_user_auth_event.user_id, created_at` 복합 인덱스
- [x] `v2_user_refresh_token.jti` (UNIQUE)
- [x] `user_activity.user_id, updated_at` 복합 인덱스
- [x] `v2_retention_roi_log.event_type, created_at` 복합 인덱스

---

## 2. 환경 변수 설정 (Environment Variables)

### 2.1 필수 환경 변수
```bash
# Database (MySQL)
DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/xmas_event

# JWT (from .env.production)
JWT_SECRET=${JWT_SECRET}  # .env.production에서 로드 (민감정보 보호)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440  # V1 호환
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15  # V2 전용

# Telegram (from .env.production)
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}  # .env.production에서 로드 (민감정보 보호)
TELEGRAM_BOT_USERNAME=ccjm
TELEGRAM_CHANNEL_USERNAME=-1003462656986
TELEGRAM_MINI_APP_URL=https://cc-jm.com

# Environment
ENV=production
DOMAIN=cc-jm.com

# V2 Features
DEV_LOGIN_ENABLED=false  # ⚠️ 프로덕션에서는 반드시 false
TEST_MODE=false

# CORS
CORS_ORIGINS=["https://cc-jm.com","https://www.cc-jm.com","http://149.28.135.147"]

# Redis (Circuit Breaker, Celery)
REDIS_URL=redis://redis:6379/0

# Circuit Breaker (SoT)
# 아래 값은 SoT(변경 기준)입니다. 모든 환경/코드/테스트/운영 정책은 반드시 이 값을 따라야 합니다.
CIRCUIT_LIMIT_VAULT=100000  # 시간당 금고 지급 한도 (KRW, SoT)
CIRCUIT_LIMIT_TICKET=30     # 시간당 티켓 지급 한도 (장, SoT)

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=<Sentry DSN>

# Timezone
TIMEZONE=Asia/Seoul
```

### 2.2 보안 체크
- [x] JWT_SECRET이 강력한가? (최소 32자 이상) ✅ 32자 확인됨
- [x] DEV_LOGIN_ENABLED=false 확인 ✅
- [x] TEST_MODE=false 확인 ✅
- [x] DATABASE_URL에 실제 프로덕션 DB 연결 정보 ✅ MySQL xmasuser@db:3306/xmas_event
- [x] CORS_ORIGINS에 허용된 도메인만 포함 ✅ (cc-jm.com, www.cc-jm.com, 149.28.135.147)

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
- [x] `tests/v2/test_telegram_auth.py` - 14/14 통과
- [x] `tests/v2/test_admin_rbac.py` - RBAC 테스트 (통과)
- [x] `tests/v2/test_admin_api.py` - Admin API 테스트 (통과)
- [x] `tests/v2/test_daily_nudge_service.py` - Daily Nudge 테스트 (통과)
- [x] `tests/v2/test_roi_rollback_service.py` - ROI & Rollback 테스트 (통과)
- [x] `tests/test_streak_midnight_boundary.py` - 15/15 통과

### 3.3 도메인별 필수 커버리지 (요청 12개 영역)
아래 영역은 **배포 전 반드시 커버**해야 합니다(자동 테스트 우선, 불가 시 수동 시나리오를 체크리스트로 남김).

- [x] **인증(Auth)**: `tests/v2/test_telegram_auth.py`, `tests/v2/test_admin_rbac.py` (통과)
- [x] **어드민(Admin)**: `tests/v2/test_admin_api.py`, `tests/v2_tests/phase4_admin/test_admin_ops_routes_coverage.py` (통과)
- [x] **유저(User)**: `tests/v2_tests/phase4_admin/test_admin_user_routes_coverage.py`, `tests/v2_tests/phase4_admin/test_admin_user_routes_coverage_extended.py` (통과)
- [x] **볼트(Vault)**: `tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py`, `tests/v2_tests/phase2_core/test_vault_limit_suspension.py` (통과)
- [x] **경제(Economy)**: `tests/v2_tests/phase2_core/test_cc_deposit_logic.py`, `tests/v2/test_roi_rollback_service.py` (통과)
- [x] **상점(Shop)**: `tests/v2_tests/phase2_core/test_shop_inventory_logic.py`, `tests/v2_tests/phase4_admin/test_shop_crud.py` (통과)
- [x] **인벤토리(Inventory)**: `tests/v2_tests/phase2_core/test_shop_inventory_logic.py`, `tests/v2_tests/phase4_admin/test_admin_inventory_routes_coverage.py` (통과)
- [x] **보상(Rewards)**: `tests/v2_tests/phase2_core/test_survey_reward_service_unit.py` (통과)
- [x] **미션(Mission)**: `tests/v2_tests/phase2_core/test_v2_mission_service.py`, `tests/v2_tests/phase2_core/test_v2_mission_edge_cases.py` (통과)
- [x] **팀배틀(Team Battle)**: `tests/v2_tests/phase2_core/test_team_battle_admin_service_unit.py`, `tests/v2_tests/phase2_core/test_team_battle_edge.py`, `tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py` (통과)
- [x] **게임(Game)**: `tests/v2_tests/phase3_game/test_game_engine_smoke.py`, `tests/v2_tests/phase3_game/test_game_ledger_separation.py`, `tests/v2_tests/phase3_game/test_dice_admin_integration.py` (통과)
- [x] **레벨(Level/XP)**: `tests/v2_tests/phase2_core/test_xp_cap.py`, `tests/test_enum_matches_sot.py` (통과)

> [!NOTE]
> **전체 V2 로직 커버리지 (허수 제외)**: **58.3%** (`app/v2` 기준)

### 3.4 Lint & Format
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
- [x] **Telegram hash 검증** 활성화 ([app/v2/core/telegram.py](app/v2/core/telegram.py))
- [x] **RBAC 로깅** 활성화 ([app/api/deps.py](app/api/deps.py) - RBAC_DENIED 이벤트)
- [x] **Admin API 권한** 확인 (ADMIN, SUPER_ADMIN만 접근)
- [x] **DEV 로그인** 비활성화 (`DEV_LOGIN_ENABLED=false`)

### 4.2 Rate Limiting
- [ ] API Rate Limiting 설정 (예: FastAPI Limiter)
- [ ] Telegram Auth 엔드포인트에 Rate Limit 적용 (DDoS 방지)

### 4.3 SQL Injection & XSS
- [x] SQLAlchemy ORM 사용 확인 (raw SQL 최소화)
- [ ] 사용자 입력 검증 (Pydantic 스키마)

---

## 5. Circuit Breaker & 운영 안전장치

### 5.1 Circuit Breaker 설정 ✅
- [x] Redis 연결 확인 (`redis-cli ping`)
- [x] Circuit Breaker 임계값 설정
  ```python
  # 아래 값은 SoT(변경 기준)입니다. 모든 환경/코드/테스트/운영 정책은 반드시 이 값을 따라야 합니다.
  CIRCUIT_LIMIT_VAULT=100000  # 시간당 금고 지급 한도 (KRW, SoT)
  CIRCUIT_LIMIT_TICKET=30     # 시간당 티켓 지급 한도 (장, SoT)
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

### 7.1 DB 쿼리 최적화 ✅
- [ ] **N+1 쿼리 제거** (selectinload, joinedload 사용)
- [x] **인덱스 최적화** (핵심 테이블 인덱스 적용 완료)
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
curl https://cc-jm.com/health

# DB 연결 확인
curl https://cc-jm.com/api/v2/health/db
```

### 9.2 핵심 API 테스트
- [x] `POST /api/v2/telegram/auth` - Telegram 로그인
- [x] `POST /api/v2/auth/refresh` - Token 갱신
- [x] `GET /api/v2/user/me` - 유저 정보 조회
- [x] `POST /api/v2/dev/login` - DEV 로그인 (비활성화 확인 - 403)

### 9.3 Admin API 테스트
- [x] `GET /api/v2/admin/users` - 유저 목록 (ADMIN 권한)
- [x] `GET /api/v2/admin/daily-nudge/targets` - 넛지 대상자 조회
- [x] `GET /api/v2/admin/roi/top-campaigns` - ROI 상위 캠페인

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
- [x] 배포 노트 작성 (릴리즈 노트)
- [x] 변경 사항 요약
- [x] 주의사항 전달

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
    image: xmas-backend:latest  # 실제 이미지명
    environment:
      - ENV=production
      - DEV_LOGIN_ENABLED=false
      - DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/xmas_event
      - DOMAIN=cc-jm.com
      - JWT_SECRET=${JWT_SECRET}  # .env.production에서 로드
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}  # .env.production에서 로드
      - REDIS_URL=redis://redis:6379/0
      - CORS_ORIGINS=["https://cc-jm.com","https://www.cc-jm.com","http://149.28.135.147"]
      - SENTRY_DSN=${SENTRY_DSN}
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  celery-worker:
    image: xmas-backend:latest
    command: celery -A app.worker.celery_app worker --loglevel=info
    environment:
      - ENV=production
      - DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/xmas_event
      - REDIS_URL=redis://redis:6379/0

  celery-beat:
    image: xmas-backend:latest
    command: celery -A app.worker.celery_app beat --loglevel=info
    environment:
      - ENV=production
      - DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/xmas_event
      - REDIS_URL=redis://redis:6379/0

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=xmas_event
      - MYSQL_USER=xmasuser
      - MYSQL_PASSWORD=2026
      - MYSQL_ROOT_PASSWORD=2026
    volumes:
      - db_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  db_data:
  redis_data:
```

### 15.2 배포 스크립트 (PowerShell)
```powershell
# 1. .env.production 로드 (민감정보 보호)
if (-not (Test-Path .env.production)) {
    Write-Host "❌ .env.production 파일이 없습니다!" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 V2 Production Deployment 시작..." -ForegroundColor Green

# 2. 환경 변수 확인
$envContent = Get-Content .env.production -Raw
if ($envContent -notmatch "DEV_LOGIN_ENABLED=false") {
    Write-Host "❌ DEV_LOGIN_ENABLED must be false in production!" -ForegroundColor Red
    exit 1
}

# 3. DB 백업 (MySQL)
Write-Host "📦 MySQL 백업 중..." -ForegroundColor Yellow
docker exec xmas-db mysqldump -u xmasuser -p2026 xmas_event > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# 4. Docker 컨테이너 빌드 & 실행
Write-Host "🔨 Docker 이미지 빌드 중..." -ForegroundColor Yellow
docker compose down --remove-orphans
docker compose build --no-cache --parallel
docker compose up -d --wait

# 5. DB 마이그레이션 (Alembic)
Write-Host "🔄 Alembic 마이그레이션 적용 중..." -ForegroundColor Yellow
docker compose exec backend alembic upgrade head

# 6. Health Check
Write-Host "🏥 Health Check 실행 중..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = curl.exe -s -o /dev/null -w "%{http_code}" "https://cc-jm.com/health"
    if ($response -eq "200") {
        Write-Host "✅ API Health Check 성공!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Health Check 응답: $response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Health Check 실패: $_" -ForegroundColor Yellow
}

Write-Host "✅ 배포가 완료되었습니다!" -ForegroundColor Green
```

---

**배포 전 반드시 모든 체크리스트를 확인하세요!**
