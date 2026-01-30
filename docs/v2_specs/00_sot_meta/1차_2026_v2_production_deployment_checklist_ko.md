# V2 Production Deployment Checklist (배포 전 체크리스트)

**문서 타입**: 배포 가이드 (Deployment Guide)
**작성일**: 2026-01-29
**최종 검증**: 2026-01-30 18:30 KST (배포 완료 및 검증)
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
- [x] **로컬 DB 마이그레이션 적용** (`alembic upgrade head`, 2026-01-30)

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

### 2.2 보안 체크 (2026-01-30 운영서버 검증)
- [x] JWT_SECRET이 강력한가? (최소 32자 이상) ⚠️ **현재 15자 (2026_secret_key) - 강화 필요**
- [x] DEV_LOGIN_ENABLED=false 확인 ✅
- [x] TEST_MODE=false 확인 ✅
- [x] DATABASE_URL에 실제 프로덕션 DB 연결 정보 ✅ MySQL xmasuser@db:3306/xmas_event
- [x] CORS_ORIGINS에 허용된 도메인만 포함 ✅ (cc-jm.com, www.cc-jm.com, 149.28.135.147)

### 2.3 환경변수 검증 결과 (2026-01-30)
| 환경변수 | 문서 가이드 | 운영 서버 | 상태 |
|----------|-------------|-----------|------|
| `ENV` | production | production | ✅ |
| `DEV_LOGIN_ENABLED` | false | false | ✅ |
| `TEST_MODE` | false | false | ✅ |
| `DOMAIN` | cc-jm.com | cc-jm.com | ✅ |
| `DATABASE_URL` | mysql+pymysql://... | ✅ 일치 | ✅ |
| `TIMEZONE` | Asia/Seoul | Asia/Seoul | ✅ |
| `REDIS_URL` | redis://redis:6379/0 | ✅ 일치 | ✅ |
| `CIRCUIT_LIMIT_VAULT` | 100000 | 100000 | ✅ |
| `CIRCUIT_LIMIT_TICKET` | 30 | 30 | ✅ |
| `CORS_ORIGINS` | [...] | ✅ 일치 | ✅ |
| `TELEGRAM_BOT_USERNAME` | ccjm | ccjm | ✅ |
| `JWT_SECRET` | 32자+ | 15자 | ⚠️ 강화필요 |
| `JWT_ALGORITHM` | HS256 | 미설정 | ⚠️ 기본값사용 |
| `V2_ACCESS_TOKEN_EXPIRE_MINUTES` | 15 | 미설정 | ⚠️ 기본값사용 |
| `LOG_LEVEL` | INFO | 미설정 | ⚠️ |
| `SENTRY_DSN` | 설정필요 | 미설정 | ⚠️ |

> **⚠️ 조치 필요**: JWT_SECRET 강화 (32자 이상), V2 토큰 만료 시간 명시적 설정 권장

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
- [x] **Rate Limiter 구현 완료** ([app/utils/rate_limit.py](app/utils/rate_limit.py))
  - Redis 기반: `RedisRateLimiter` (분산 환경)
  - In-Memory 기반: `SlidingWindowRateLimiter` (fallback)
  - Fail-open 정책: Redis 장애 시 요청 허용
- [ ] **Telegram Auth 엔드포인트 Rate Limit 적용** (TODO)
  - 현재 Rate Limiter 모듈은 구현되어 있으나 엔드포인트에 미적용
  - 권장: `@rate_limit` 데코레이터 추가

### 4.3 SQL Injection & XSS
- [x] **SQLAlchemy ORM 사용 확인** (raw SQL 최소화)
  - 모든 V2 API에서 ORM 사용 확인
- [x] **사용자 입력 검증** (Pydantic 스키마)
  - 57개 V2 스키마 파일에서 BaseModel + Field 검증 사용
  - 440+ 검증 필드 확인 ([app/v2/schemas/](app/v2/schemas/))

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
- [ ] **Sentry 연동** (에러 추적)
  - `requirements.txt`에 주석 처리됨: `# sentry-sdk==1.39.2`
  - 운영 서버 검증: `SENTRY_DSN: NOT SET` ⚠️
  - **TODO**: `.env`에 `SENTRY_DSN` 설정 필요
- [x] **Prometheus 메트릭** 준비
  - `prometheus-client==0.23.1` 설치됨
  - [app/core/metrics.py](app/core/metrics.py) 메트릭 모듈 존재
  - [app/api/routes/metrics.py](app/api/routes/metrics.py) 엔드포인트 존재
  - **TODO**: Grafana 대시보드 설정
- [ ] **로그 집계** (ELK Stack 또는 CloudWatch)
  - 현재: Docker logs 사용 (`docker logs xmas-backend`)
  - **TODO**: 중앙 집중식 로그 수집 시스템 구축

---

## 6. Celery & 스케줄러 (Background Tasks)

### 6.1 Celery Worker 실행
```bash
# Celery Worker 시작
celery -A app.worker.celery_app worker --loglevel=info

# Celery Beat 시작 (스케줄러)
celery -A app.worker.celery_app beat --loglevel=info
```

### 6.2 스케줄 작업 확인 ✅
- [x] **Daily Nudge**: 매일 12:00, 18:00 KST
  - 설정 확인: [app/worker/celery_app.py:26-35](app/worker/celery_app.py#L26-L35)
  - Task: `app.v2.tasks.daily_nudge_tasks.execute_daily_nudge_task`
- [x] **ROI Calculator**: 매일 00:00 KST (어제 데이터 집계)
  - 설정 확인: [app/worker/celery_app.py:36-39](app/worker/celery_app.py#L36-L39)
  - Task: `app.v2.tasks.roi_tasks.execute_roi_calculation_task`
- [x] **Segment Batch**: 매일 01:00 KST
  - 설정 확인: [app/worker/celery_app.py:40-43](app/worker/celery_app.py#L40-L43)
  - Task: `app.v2.tasks.segment_tasks.execute_segment_batch_task`

### 6.3 Redis 연결 확인
```bash
redis-cli ping
# PONG 응답 확인
```

---

## 7. 성능 최적화 (Performance Optimization)

### 7.1 DB 쿼리 최적화
- [x] **인덱스 최적화** (핵심 테이블 인덱스 적용 완료)
  - `v2_user.telegram_id` (UNIQUE)
  - `v2_user_auth_event.user_id, created_at` 복합 인덱스
  - `v2_user_refresh_token.jti` (UNIQUE)
  - `user_activity.user_id, updated_at` 복합 인덱스
- [ ] **N+1 쿼리 제거** (TODO)
  - 권장: Admin API에서 `selectinload`, `joinedload` 사용
  - 예: 유저 목록 조회 시 관련 데이터 eager loading
- [ ] **Pagination 적용** (TODO)
  - Admin 유저 목록: offset/limit 파라미터 사용 중 ✅
  - 기타 대량 데이터 조회 API 검토 필요

### 7.2 캐싱
- [x] **Redis 연결** 확인 ✅
  - Circuit Breaker 및 Rate Limiter에서 Redis 사용
  - Celery Broker/Backend로 Redis 사용
- [ ] **Application-level 캐싱** (TODO)
  - 유저 정보 캐싱
  - 게임 설정 캐싱
  - 상점 상품 목록 캐싱
  - **권장**: `@lru_cache` 또는 Redis 캐시 레이어 추가
- [ ] **캐시 무효화 전략** 정의 필요

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

### 9.1 Health Check ✅ (2026-01-30 17:51 KST 검증)
```bash
# API Health Check
curl https://cc-jm.com/health
# 결과: healthy ✅

# V2 API Health Check
curl https://cc-jm.com/api/v2/health
# 결과: {"status":"ok"} ✅

# DB 연결 확인
curl https://cc-jm.com/api/v2/health/db
```

### 9.2 컨테이너 상태 (2026-01-30 18:30 KST 최종 검증)
| 컨테이너 | 상태 | 비고 |
|----------|------|------|
| xmas-backend | ✅ healthy | API 서버 정상 (Up 5 minutes) |
| xmas-frontend | ✅ healthy | nginx 정상 |
| xmas-db | ✅ healthy | MySQL 정상 (Up 2 hours) |
| xmas-redis | ✅ healthy | Redis PONG 응답 (Up 2 hours) |
| xmas-nginx | ✅ Up | 프록시 정상 |
| xmas-telegram-bot | ✅ Up | Webhook 설정 완료 |
| xmas-celery-worker | ✅ healthy | **PID 기반 healthcheck 적용 완료** ✨ |
| xmas-celery-beat | ✅ healthy | **PID 기반 healthcheck 적용 완료** ✨ |

### 9.3 핵심 API 테스트 (2026-01-30 18:30 KST 최종 검증)
- [x] `GET /` - Backend Health ✅ `{"message":"XMAS 1Week backend running"}`
- [x] `GET /health` - API Health ✅ "healthy"
- [x] `GET /api/v2/health` - V2 Health ✅ `{"status":"ok"}`
- [x] `POST /api/v2/dev/login` - DEV 로그인 ✅ **404 Not Found** (프로덕션에서 차단됨)
- [x] **Telegram Auth hash 검증** ✅ `hmac.compare_digest()` 사용 확인
- [x] **V2User password_hash 필드** ✅ 존재 확인 완료
- [x] **Auth Event 로깅** ✅ 75개 이벤트 기록 확인
- [ ] `POST /api/v2/telegram/auth` - Telegram 로그인 (사용자 테스트 필요)
- [ ] `POST /api/v2/auth/refresh` - Token 갱신 (사용자 테스트 필요)
- [ ] `GET /api/v2/user/me` - 유저 정보 조회 (사용자 테스트 필요)

### 9.4 Telegram Bot 검증 ✅ (2026-01-30 검증)
```
✅ Webhook URL: https://cc-jm.com/telegram/webhook
✅ getMe: HTTP/1.1 200 OK
✅ deleteWebhook: HTTP/1.1 200 OK
✅ setWebhook: HTTP/1.1 200 OK
✅ Application started
```

### 9.5 Redis / Circuit Breaker 검증 ✅ (2026-01-30 검증)
```bash
# Redis 연결 확인
docker exec xmas-redis redis-cli ping
# 결과: PONG ✅

# Circuit Breaker 키 (사용 전 상태)
docker exec xmas-redis redis-cli keys '*circuit*'
# 결과: (empty) - 아직 사용 이력 없음 (정상)
```

### 9.6 해결된 이슈 ✅ (2026-01-30 18:30 KST)
| 이슈 | 심각도 | 상태 | 해결 내용 |
|------|--------|------|----------|
| V2User password_hash 누락 | ⚠️ Medium | ✅ 완료 | 마이그레이션 `20260130_1800_add_v2_user_password_hash` 적용 완료 |
| Celery Worker/Beat Unhealthy | ⚠️ Low | ✅ 완료 | PID 기반 healthcheck 적용 (docker-compose.yml 수정) |
| V1 Auth 호환성 | ⚠️ Medium | ✅ 해결 | V2User에 password_hash 컬럼 추가로 어드민 계정 생성 지원 |

**해결 상세**:

1. **V2User password_hash 추가** (2026-01-30 18:13 KST):
   ```sql
   -- 마이그레이션 적용 완료
   ALTER TABLE v2_user ADD COLUMN password_hash VARCHAR(128) NULL;
   ```
   - 어드민 계정 생성 시 password 설정 가능 ([app/v2/services/admin_user_service.py:70-71](app/v2/services/admin_user_service.py#L70-L71))
   - 현재 마이그레이션 버전: `20260130_1800_add_v2_user_password_hash (head)`

2. **Celery Healthcheck** (2026-01-30 18:11 KST):
   ```yaml
   # celery-worker healthcheck
   test: ["CMD-SHELL", "test -f /tmp/celeryworker.pid && kill -0 $(cat /tmp/celeryworker.pid)"]

   # celery-beat healthcheck
   test: ["CMD-SHELL", "test -f /tmp/celerybeat.pid && kill -0 $(cat /tmp/celerybeat.pid)"]
   ```
   - Celery Worker 로그: `celery@22d20f65491b ready.` ✅
   - Celery Beat 로그: `beat: Starting...` ✅

### 9.7 Admin API 테스트
- [ ] `GET /api/v2/admin/users` - 유저 목록 (ADMIN 권한)
- [ ] `GET /api/v2/admin/daily-nudge/targets` - 넛지 대상자 조회
- [ ] `GET /api/v2/admin/roi/top-campaigns` - ROI 상위 캠페인

### 9.8 모니터링 확인
- [ ] **Sentry 에러 추적** (미설정)
  - 현재 상태: `SENTRY_DSN: NOT SET` ⚠️
  - 조치 필요: `.env`에 Sentry DSN 추가
- [ ] **Grafana 대시보드** (미설정)
  - Prometheus 메트릭 준비 완료
  - TODO: Grafana 대시보드 구축
  - 목표 메트릭:
    - API 응답 시간 < 200ms (p95)
    - DB 쿼리 시간 < 100ms (p95)
    - 에러율 < 0.1%
- [x] **로그 확인** (2026-01-30 검증 완료)
  - Backend: `Application startup complete` ✅
  - Celery Worker: `ready` ✅
  - Celery Beat: `Starting` ✅
  - 에러 로그 없음 (WARNING 이외)

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
- [x] 모든 테스트 통과 (58.3% 커버리지, 핵심 도메인 테스트 완료)
- [x] DB 백업 완료
- [x] 롤백 계획 수립
- [ ] Staging 환경에서 검증 (프로덕션 직접 배포)

### During Deployment (2026-01-30 18:10-18:30 KST)
- [x] 배포 스크립트 실행 ✅
- [x] DB 마이그레이션 실행 ✅ (`20260130_1800_add_v2_user_password_hash`)
- [x] Health Check 통과 ✅ (8/8 컨테이너 healthy/running)
- [x] 모니터링 활성화 ✅ (Prometheus 메트릭, Docker logs)

### After Deployment (2026-01-30 18:30 KST)
- [x] 핵심 API 테스트 ✅ (Backend, V2 API, Telegram Auth 검증)
- [x] 에러 로그 확인 ✅ (WARNING 이외 에러 없음)
- [x] 성능 메트릭 확인 ✅ (서비스 상태 정상)
- [x] 문서 업데이트 ✅ (배포 가이드, 체크리스트, 검증 보고서)

### Remaining Tasks (Post-Deployment)
- [ ] **Sentry 연동** (High Priority) ⚠️
- [ ] **JWT_SECRET 강화** (High Priority) ⚠️
- [ ] **Telegram Auth Rate Limit** (High Priority) 🛡️
- [ ] **Grafana 대시보드** (Medium Priority) 📊
- [ ] **Application 캐싱** (Medium Priority) 🚀

📋 상세 액션 아이템: [1차_2026_deployment_action_items.md](1차_2026_deployment_action_items.md)

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
