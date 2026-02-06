# V2 서버 배포 가이드 (V2 Server Deployment Guide)

**문서 타입**: 서버 배포 가이드 (Server Setup)
**작성일**: 2026-01-29
**최종 검증**: 2026-01-30 18:30 KST (배포 완료 및 검증)
**대상**: DevOps, 인프라 담당자
**스택**: Vultr, Docker, MySQL, Redis, FastAPI

---

## 📋 1. 사전 준비 (Prerequisites)

### 1.1 서버 사양 (Instance Specs)
Golden V2의 실시간 개입(Intervention) 및 대량 로그 처리를 위해 다음 사양 이상을 권장합니다.
- **Provider**: Vultr (Cloud Compute)
- **Location**: Seoul (ICN)
- **OS**: Ubuntu 22.04 LTS
- **Size**: 2 vCPU / 4GB RAM / 80GB SSD 이상

### 1.2 유저 접점: 텔레그램 봇 설정 (User Portal)
- **BotFather**: `SetWebApp` 메뉴를 통해 `https://cc-jm.com` (유저 도메인) 연결.
- **Bot Token**: 프로덕션 전용 토큰 준비 (`.env.production`에서 로드)

### 1.3 어드민 접점: 보안 및 도메인 (Admin Portal)
- **도메인**: `cc-jm.com` (유저 & 어드민 통합 도메인)
- **SSL**: HTTPS 반드시 활성화 (nginx 프록시 통해 SSL 종료)
- **CORS**: https://cc-jm.com, https://www.cc-jm.com, http://149.28.135.147 (프리플라이트 요청 허용)

---

## 🛠️ 2. 서버 환경 구축 (Standard Setup)

### 2.1 도구 설치
```bash
apt-get update && apt-get install -y git docker.io docker-compose-plugin
```

### 2.2 코드 체크아웃
```bash
git clone [Github_Url] /opt/ch25
cd /opt/ch25
```

---

## ⚙️ 3. 환경 변수 설정 (.env)

V2의 핵심 운영 정책인 **Circuit Breaker**와 **Auth** 설정을 반드시 포함해야 합니다.

```bash
cp .env.example .env
nano .env
```

### [필수] V2 운영 환경 변수
```ini
# Core
ENV=production
TEST_MODE=false
DEV_LOGIN_ENABLED=false  # 🚨 프로덕션 실무 차단 필수
DOMAIN=cc-jm.com

# Timezone (Golden V2 핵심: 09:00 KST 리셋)
TIMEZONE=Asia/Seoul

# Database (MySQL)
DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/xmas_event

# Security (JWT)
JWT_SECRET=${JWT_SECRET}  # .env.production에서 로드 (민감정보 보호)
JWT_ALGORITHM=HS256
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}  # .env.production에서 로드 (민감정보 보호)
TELEGRAM_BOT_USERNAME=ccjm
TELEGRAM_CHANNEL_USERNAME=-1003462656986
TELEGRAM_MINI_APP_URL=https://cc-jm.com

# CORS
CORS_ORIGINS=["https://cc-jm.com","https://www.cc-jm.com","http://149.28.135.147"]

# Redis (Circuit Breaker, Celery)
REDIS_URL=redis://redis:6379/0

# Golden V2 Safety (Circuit Breaker - SoT)
# 아래 값은 SoT(변경 기준)입니다. 모든 환경/코드/테스트/운영 정책은 반드시 이 값을 따라야 합니다.
CIRCUIT_LIMIT_VAULT=100000  # 시간당 금고 지급 한도 (KRW, SoT)
CIRCUIT_LIMIT_TICKET=30     # 시간당 티켓 지급 한도 (장, SoT)
```

---

## 🚀 4. 배포 실행 (Execution)

### 4.1 서비스 기동
```bash
# 최신 이미지 빌드 및 백그라운드 실행
docker compose up -d --build
```

### 4.2 어드민 계정 보호 로직 (Admin Security) ✅
- [x] **배포 완료**: V2User에 password_hash 컬럼 추가 (20260130_1800 마이그레이션)
- [x] **어드민 계정 생성**: `app/v2/services/admin_user_service.py:70-71`에서 password 설정 지원
- [x] **보안 검증**: 어드민 생성 시 password_hash 정상 저장 확인

### 4.3 유저 데이터 무결성 체크 (User Integrity)
V1 유저가 V2로 처음 진입할 때 `v2_user` 테이블에 정상적으로 복제(Lazy-migration)되도록 Redis 캐시가 비워져 있는지 확인합니다.

---

### 4.4 DB 마이그레이션 (Alembic)
V2의 신규 테이블(v2_user, v2_ops_plan 등) 생성을 위해 필수적으로 실행합니다.
```bash
docker compose exec backend alembic upgrade head
```

---

## 🔍 5. 초기 데이터 적재 (Optional)

시스템 가동을 위한 기초 데이터(레벨 보상, 상점 목록 등)가 필요한 경우 다음 명령을 사용합니다.
```bash
# 레벨 보상 및 미션 기초 데이터 적재
docker compose exec backend python scripts/seed_v2_essential_data.py
```

---

## 📡 6. 접속 확인 및 헬스 체크

| 컴포넌트 | 경로 | 확인 방법 |
| :--- | :--- | :--- |
| **Backend API** | `https://cc-jm.com/health` | `healthy` 확인 |
| **V2 API** | `https://cc-jm.com/api/v2/health` | `{"status": "ok"}` 확인 |
| **Frontend** | `https://cc-jm.com/` | 메인 페이지 로딩 및 텔레그램 로그인 확인 |
| **DB Health** | `docker ps` | `xmas-db` 컨테이너 상태 Healthy 확인 |
| **Redis** | `redis-cli ping` | `PONG` 응답 확인 |
| **Telegram Bot** | `docker compose logs telegram_bot` | `Application started` 확인 |

.github/workflows/deploy.yml 파일에서 다음 3곳을 수정했습니다:

Line 76: env 섹션에 SENTRY_DSN 추가
Line 81: envs 리스트에 SENTRY_DSN 추가
Line 120: .env 파일 생성 시 echo "SENTRY_DSN=${SENTRY_DSN}" >> .env 추가

---

## 📋 7. 운영 서버 검증 결과 (2026-01-30 18:30 KST 최종)

### 7.1 컨테이너 상태 ✅ 전체 정상
```bash
ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

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

### 7.2 API 헬스체크
```bash
# API Health
curl https://cc-jm.com/health
# 결과: healthy ✅

# V2 API Health
curl https://cc-jm.com/api/v2/health
# 결과: {"status":"ok"} ✅

# DEV Login 차단 확인
curl -X POST https://cc-jm.com/api/v2/dev/login
# 결과: 404 Not Found ✅ (엔드포인트 비활성화)
```

### 7.3 Telegram Bot 검증
```bash
docker compose logs telegram_bot --tail=10
# ✅ Webhook URL: https://cc-jm.com/telegram/webhook
# ✅ getMe: HTTP/1.1 200 OK
# ✅ setWebhook: HTTP/1.1 200 OK
# ✅ Application started
```

### 7.4 Redis / Circuit Breaker
```bash
docker exec xmas-redis redis-cli ping
# 결과: PONG ✅

docker exec xmas-redis redis-cli keys '*circuit*'
# 결과: (empty) - 아직 사용 전 상태 (정상)
```

### 7.5 해결된 이슈 ✅ (2026-01-30 18:30 KST)
| 이슈 | 심각도 | 최종 상태 | 해결 내용 |
|------|--------|-----------|----------|
| V2User password_hash 누락 | ⚠️ Medium | ✅ 완료 | **운영 서버 마이그레이션 적용 완료** (20260130_1800) |
| Celery Worker/Beat Unhealthy | ⚠️ Low | ✅ 완료 | **운영 서버 healthcheck 적용 완료** (PID 기반) |

**배포 완료 내역**:
1. **마이그레이션 실행** (2026-01-30 18:13 KST):
   ```bash
   # 마이그레이션 파일 업로드 및 적용
   docker cp 20260130_1800_add_v2_user_password_hash.py xmas-backend:/app/alembic/versions/
   docker exec xmas-backend alembic current
   # 결과: 20260130_1800_add_v2_user_password_hash (head) ✅
   ```

2. **DB 검증** (2026-01-30 18:15 KST):
   ```sql
   DESCRIBE v2_user;
   -- password_hash varchar(128) YES NULL ✅
   ```

3. **Celery 헬스체크 적용** (2026-01-30 18:11 KST):
   - Celery Worker: `celery@22d20f65491b ready.` ✅
   - Celery Beat: `beat: Starting...` ✅
   - 모든 컨테이너 healthy 상태 확인 ✅

4. **Auth 검증**:
   - Telegram hash 검증: `hmac.compare_digest()` 사용 확인 ✅
   - Auth Event 로깅: 75개 이벤트 기록 ✅
   - DEV 로그인 차단: 404 Not Found ✅

> [!SUCCESS]
> 2026-01-30 18:30 KST 기준, 모든 V2 서비스가 정상 작동 중입니다.
> 상세 검증 보고서: `docs/v2_specs/90_troubleshooting/20260130_deployment_verification_report.md`

---

## 🎯 8. 배포 완료 요약 (Deployment Summary)

### 8.1 배포 일시
- **배포 시작**: 2026-01-30 18:10 KST
- **마이그레이션 완료**: 2026-01-30 18:13 KST
- **검증 완료**: 2026-01-30 18:30 KST
- **총 소요 시간**: 약 20분

### 8.2 주요 변경 사항
1. ✅ V2User 테이블에 `password_hash` 컬럼 추가
   - 어드민 계정 생성 시 password 설정 지원
   - 마이그레이션: `20260130_1800_add_v2_user_password_hash`

2. ✅ Celery Worker/Beat healthcheck 적용
   - PID 파일 기반 헬스체크 구현
   - 모든 컨테이너 healthy 상태 달성

3. ✅ Telegram Auth 보안 강화 확인
   - `hmac.compare_digest()` 타이밍 공격 방지
   - Auth Event 로깅 정상 작동 (75개 이벤트)

### 8.3 시스템 상태
- **서비스 가동률**: 100% (8/8 컨테이너 정상)
- **API 응답**: 정상
- **DB 연결**: 정상 (3 users in v2_user)
- **에러 로그**: 없음 (WARNING 이외)

### 8.4 다음 단계
- [ ] 사용자 Telegram 로그인 테스트
- [ ] Admin API 전체 기능 테스트
- [ ] 성능 모니터링 (Sentry, Grafana 연동)
- [ ] JWT_SECRET 강화 (32자 이상으로 변경)

**배포 담당자**: Claude AI
**검증 문서**: [20260130_deployment_verification_report.md](../90_troubleshooting/20260130_deployment_verification_report.md)
